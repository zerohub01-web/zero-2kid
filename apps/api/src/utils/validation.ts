import { z } from "zod";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Booking ID format");

export const loginSchema = z.object({
  body: z.object({
    adminId: z.string().min(3),
    password: z.string().min(6)
  })
});

export const customerSignupSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6)
  })
});

export const customerLoginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6)
  })
});

export const customerGoogleSchema = z.object({
  body: z.object({
    credential: z.string().min(10)
  })
});

export const createBookingSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(6).max(20),
    businessType: z.string().min(2),
    service: z.string().min(2),
    budget: z.union([z.number().nonnegative(), z.string().min(1)]).optional(),
    message: z.string().min(5).max(1200),
    date: z.string().optional(),
    website: z.string().optional().default(""),
    recaptchaToken: z.string().optional().default(""),
    recaptchaAction: z.enum(["booking_submit", "chatbot_submit"]).optional()
  })
});

export const updateBookingSchema = z.object({
  body: z
    .object({
      status: z.enum(["new", "contacted", "converted", "closed", "NEW", "CONFIRMED", "COMPLETED"]).optional(),
      quotedFee: z.number().nonnegative().optional(),
      sendQuote: z.boolean().optional().default(false)
    })
    .refine((value) => typeof value.status !== "undefined" || typeof value.quotedFee !== "undefined", {
      message: "Either status or quotedFee is required."
    }),
  params: z.object({ id: objectIdSchema })
});

export const bookingIdParamSchema = z.object({
  params: z.object({ id: objectIdSchema })
});

export const bookingStatusLookupSchema = z.object({
  params: z.object({
    bookingId: z.string().trim().min(4).max(64)
  })
});

export const leadMemoryLookupSchema = z.object({
  query: z
    .object({
      email: z.string().email().optional(),
      phone: z.string().min(6).max(20).optional()
    })
    .refine((value) => Boolean(value.email || value.phone), {
      message: "Either email or phone is required."
    })
});

export const callSlotsQuerySchema = z.object({
  query: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
  })
});

export const createCallBookingSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(80),
    email: z.string().email(),
    phone: z.string().min(7).max(20),
    timeSlot: z.string().min(10)
  })
});

export const updateCallBookingStatusSchema = z.object({
  params: z.object({ id: objectIdSchema }),
  body: z.object({
    status: z.enum(["booked", "confirmed", "completed", "cancelled"])
  })
});

export const whatsappSendSchema = z.object({
  body: z.object({
    phone: z
      .string()
      .trim()
      .regex(/^\+?[1-9]\d{7,14}$/, "Invalid phone number format."),
    message: z.string().trim().min(1).max(1200)
  })
});

export const updateChatStatusSchema = z.object({
  params: z.object({ id: objectIdSchema }),
  body: z.object({
    status: z.enum(["new", "engaged", "converted"])
  })
});

export const updateMilestoneSchema = z.object({
  params: z.object({
    bookingId: objectIdSchema,
    milestoneKey: z.enum(["planned", "in_progress", "delivered"])
  }),
  body: z.object({
    status: z.enum(["PENDING", "DONE"]).optional(),
    fileUrl: z.string().url().optional(),
    comment: z.string().min(1).optional()
  })
});

export const serviceSchema = z.object({
  body: z.object({
    title: z.string().min(2),
    price: z.number().nonnegative(),
    isActive: z.boolean().optional()
  })
});

export const workSchema = z.object({
  body: z.object({
    title: z.string().min(2),
    slug: z.string().min(2),
    coverImage: z.string().url(),
    gallery: z.array(z.string().url()).default([]),
    type: z.string().min(2),
    result: z.string().min(2),
    seoTitle: z.string().default(""),
    seoDescription: z.string().default("")
  })
});
