export class ApiResponse {
    static success<T = any>(message: string, data?: T, meta?: any) {
      return {
        success: true,
        message,
        data,
        meta,
        timestamp: new Date().toISOString()
      };
    }
  
    static error(message: string, error?: string, statusCode?: number, details?: any) {
      return {
        success: false,
        message,
        error,
        statusCode,
        details,
        timestamp: new Date().toISOString()
      };
    }
  
    static paginated<T = any>(
      data: T[], 
      total: number, 
      page: number, 
      limit: number, 
      message: string = 'Data retrieved successfully'
    ) {
      const totalPages = Math.ceil(total / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;
  
      return {
        success: true,
        message,
        data,
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage,
          hasPrevPage,
          nextPage: hasNextPage ? page + 1 : null,
          prevPage: hasPrevPage ? page - 1 : null
        },
        timestamp: new Date().toISOString()
      };
    }
  }