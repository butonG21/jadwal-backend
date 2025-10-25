import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import User, { UserRole } from '../models/User';
import { logger } from '../utils/loggers';
import { connectDatabase } from '../config/database';

interface MigrationStats {
  totalUsers: number;
  usersUpdated: number;
  usersAlreadyHaveRole: number;
  errors: number;
  adminUsers: string[];
}

class UserRoleMigration {
  private stats: MigrationStats = {
    totalUsers: 0,
    usersUpdated: 0,
    usersAlreadyHaveRole: 0,
    errors: 0,
    adminUsers: []
  };

  /**
   * Run the migration to add default roles to existing users
   */
  public async migrate(dryRun: boolean = false): Promise<MigrationStats> {
    try {
      logger.info(`Starting user role migration ${dryRun ? '(DRY RUN)' : ''}`);
      
      // Get all users
      const users = await User.find({});
      this.stats.totalUsers = users.length;
      
      logger.info(`Found ${users.length} users to process`);
      
      for (const user of users) {
        try {
          // Check if user already has a role
          if (user.role) {
            this.stats.usersAlreadyHaveRole++;
            logger.debug(`User ${user.uid} already has role: ${user.role}`);
            continue;
          }
          
          // Assign default role (USER)
          if (!dryRun) {
            user.role = UserRole.USER;
            await user.save();
          }
          
          this.stats.usersUpdated++;
          logger.info(`${dryRun ? '[DRY RUN] ' : ''}Updated user ${user.uid} (${user.name}) with role: ${UserRole.USER}`);
          
        } catch (error) {
          this.stats.errors++;
          logger.error(`Failed to update user ${user.uid}:`, error);
        }
      }
      
      logger.info('Migration completed', this.stats);
      return this.stats;
      
    } catch (error) {
      logger.error('Migration failed:', error);
      throw error;
    }
  }

  /**
   * Promote specific users to admin role
   */
  public async promoteToAdmin(userIds: string[], dryRun: boolean = false): Promise<string[]> {
    const promotedUsers: string[] = [];
    
    try {
      logger.info(`Promoting ${userIds.length} users to admin ${dryRun ? '(DRY RUN)' : ''}`);
      
      for (const uid of userIds) {
        try {
          const user = await User.findOne({ uid });
          
          if (!user) {
            logger.warn(`User not found: ${uid}`);
            continue;
          }
          
          if (user.role === UserRole.ADMIN) {
            logger.info(`User ${uid} is already an admin`);
            continue;
          }
          
          if (!dryRun) {
            user.role = UserRole.ADMIN;
            await user.save();
          }
          
          promotedUsers.push(uid);
          this.stats.adminUsers.push(uid);
          logger.info(`${dryRun ? '[DRY RUN] ' : ''}Promoted user ${uid} (${user.name}) to admin`);
          
        } catch (error) {
          logger.error(`Failed to promote user ${uid}:`, error);
        }
      }
      
      return promotedUsers;
      
    } catch (error) {
      logger.error('Admin promotion failed:', error);
      throw error;
    }
  }

  /**
   * Get migration statistics without running migration
   */
  public async getStats(): Promise<{
    totalUsers: number;
    usersWithoutRole: number;
    usersWithRole: number;
    roleDistribution: Record<string, number>;
  }> {
    try {
      const totalUsers = await User.countDocuments({});
      const usersWithoutRole = await User.countDocuments({ role: { $exists: false } });
      const usersWithRole = totalUsers - usersWithoutRole;
      
      // Get role distribution
      const roleDistribution = await User.aggregate([
        { $match: { role: { $exists: true } } },
        { $group: { _id: '$role', count: { $sum: 1 } } },
        { $project: { role: '$_id', count: 1, _id: 0 } }
      ]);
      
      const distribution: Record<string, number> = {};
      roleDistribution.forEach(item => {
        distribution[item.role] = item.count;
      });
      
      return {
        totalUsers,
        usersWithoutRole,
        usersWithRole,
        roleDistribution: distribution
      };
      
    } catch (error) {
      logger.error('Failed to get migration stats:', error);
      throw error;
    }
  }

  /**
   * Rollback migration (remove role field from all users)
   */
  public async rollback(dryRun: boolean = false): Promise<number> {
    try {
      logger.warn(`Starting role migration rollback ${dryRun ? '(DRY RUN)' : ''}`);
      
      const usersWithRole = await User.find({ role: { $exists: true } });
      
      logger.info(`Found ${usersWithRole.length} users with roles to rollback`);
      
      if (!dryRun) {
        const result = await User.updateMany(
          { role: { $exists: true } },
          { $unset: { role: 1 } }
        );
        
        logger.warn(`Rollback completed. Removed role from ${result.modifiedCount} users`);
        return result.modifiedCount;
      } else {
        logger.info(`[DRY RUN] Would remove role from ${usersWithRole.length} users`);
        return usersWithRole.length;
      }
      
    } catch (error) {
      logger.error('Rollback failed:', error);
      throw error;
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const dryRun = args.includes('--dry-run');
  
  try {
    await connectDatabase();
    
    const migration = new UserRoleMigration();
    
    switch (command) {
      case 'migrate':
        await migration.migrate(dryRun);
        break;
        
      case 'stats':
        const stats = await migration.getStats();
        console.log('\n=== Migration Statistics ===');
        console.log(`Total Users: ${stats.totalUsers}`);
        console.log(`Users without role: ${stats.usersWithoutRole}`);
        console.log(`Users with role: ${stats.usersWithRole}`);
        console.log('\nRole Distribution:');
        Object.entries(stats.roleDistribution).forEach(([role, count]) => {
          console.log(`  ${role}: ${count}`);
        });
        break;
        
      case 'promote':
        const userIds = args.slice(1).filter(arg => !arg.startsWith('--'));
        if (userIds.length === 0) {
          console.error('Please provide user IDs to promote');
          process.exit(1);
        }
        await migration.promoteToAdmin(userIds, dryRun);
        break;
        
      case 'rollback':
        const confirmed = args.includes('--confirm');
        if (!confirmed && !dryRun) {
          console.error('Rollback requires --confirm flag or --dry-run');
          process.exit(1);
        }
        await migration.rollback(dryRun);
        break;
        
      default:
        console.log(`
Usage: ts-node scripts/migrateUserRoles.ts <command> [options]

Commands:
  migrate                 Add default USER role to users without role
  stats                   Show current migration statistics
  promote <uid1> <uid2>   Promote specific users to admin
  rollback                Remove role field from all users (requires --confirm)

Options:
  --dry-run              Show what would be done without making changes
  --confirm              Required for rollback command

Examples:
  ts-node scripts/migrateUserRoles.ts stats
  ts-node scripts/migrateUserRoles.ts migrate --dry-run
  ts-node scripts/migrateUserRoles.ts migrate
  ts-node scripts/migrateUserRoles.ts promote user123 user456 --dry-run
  ts-node scripts/migrateUserRoles.ts rollback --dry-run
  ts-node scripts/migrateUserRoles.ts rollback --confirm
        `);
        process.exit(1);
    }
    
  } catch (error) {
    logger.error('Migration script failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { UserRoleMigration };