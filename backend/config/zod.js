import z from "zod";

export const registerSchema = z.object({
    name:z.string().min(3,"Name must be atleast 3 character long"),
    email:z.string().email("Invalid email format"),
    password:z.string().min(4,"Password must be at least 8 characters long"),
})

export const loginSchema = z.object({
    email:z.string().email("Invalid email format"),
    password:z.string().min(4,"Password must be at least 4 characters long"),
})