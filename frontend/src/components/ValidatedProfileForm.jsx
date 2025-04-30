import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const schema = z.object({
  name: z.string().min(2, 'יש להזין שם מלא'),
  email: z.string().email('יש להזין אימייל תקני'),
  phone: z.string().min(9, 'טלפון לא תקין'),
});

export default function ValidatedProfileForm({ onSubmit }) {
  const { register, handleSubmit, formState: { errors, isSubmitting, isSubmitSuccessful } } = useForm({
    resolver: zodResolver(schema),
    mode: 'onChange',
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} aria-label="טופס פרופיל">
      <div>
        <label htmlFor="name">שם מלא:</label>
        <input id="name" {...register('name')} aria-invalid={!!errors.name} aria-describedby="name-error" />
        {errors.name && <span id="name-error" style={{color:'red'}}>{errors.name.message}</span>}
      </div>
      <div>
        <label htmlFor="email">אימייל:</label>
        <input id="email" {...register('email')} aria-invalid={!!errors.email} aria-describedby="email-error" />
        {errors.email && <span id="email-error" style={{color:'red'}}>{errors.email.message}</span>}
      </div>
      <div>
        <label htmlFor="phone">טלפון:</label>
        <input id="phone" {...register('phone')} aria-invalid={!!errors.phone} aria-describedby="phone-error" />
        {errors.phone && <span id="phone-error" style={{color:'red'}}>{errors.phone.message}</span>}
      </div>
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "שומר..." : "שמור"}
      </button>
      {isSubmitSuccessful && <div style={{color:'green'}}>הפרטים נשמרו בהצלחה!</div>}
    </form>
  );
}
