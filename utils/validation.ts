import Joi from 'joi';

export const validationSchemas = {
  employeeId: Joi.string().trim().min(1).max(50).required(),
  
  monthYear: Joi.object({
    month: Joi.number().integer().min(1).max(12).required(),
    year: Joi.number().integer().min(2020).max(2030).required()
  }),

  dateRange: Joi.object({
    start_date: Joi.date().iso().required(),
    end_date: Joi.date().iso().min(Joi.ref('start_date')).required()
  }).custom((value, helpers) => {
    const { start_date, end_date } = value;
    const daysDiff = Math.abs(new Date(end_date).getTime() - new Date(start_date).getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysDiff > 365) {
      return helpers.error('dateRange.tooLarge');
    }
    
    return value;
  }).messages({
    'dateRange.tooLarge': 'Date range cannot exceed 365 days'
  }),

  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
  }),

  login: Joi.object({
    username: Joi.string().trim().min(3).max(50).required(),
    password: Joi.string().min(6).max(100).required()
  }),

  attendanceFilter: Joi.object({
    date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
    month: Joi.number().integer().min(1).max(12).required(),
    year: Joi.number().integer().min(2020).max(2030).required()
  })
};

export function validateRequest(schema: Joi.ObjectSchema) {
  return (req: any, res: any, next: any) => {
    const { error, value } = schema.validate({
      ...req.body,
      ...req.query,
      ...req.params
    }, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return res.status(400).json(
        ApiResponse.error(
          'Validation failed',
          'VALIDATION_ERROR',
          400,
          errorDetails
        )
      );
    }

    // Replace req properties with validated values
    Object.assign(req.body, value);
    Object.assign(req.query, value);
    Object.assign(req.params, value);

    next();
  };
}