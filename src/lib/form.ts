import z from "zod";

export function parseFormData<Types extends z.ZodRawShape>(
  data: FormData,
  schema: z.ZodObject<Types>
) {
  const parsed = schema.safeParse(Object.fromEntries(data.entries()));

  if (parsed.success === false) {
    console.error(parsed.error);
    return {
      errors: { ...parsed.error.formErrors.fieldErrors, other: "" },
      data: null,
    };
  }
  return { errors: null, data: parsed.data };
}

export function handleFormData<Types extends z.ZodRawShape, TRet>(
  schema: z.ZodObject<Types>,
  handler: (
    parse: () => ReturnType<typeof parseFormData<Types>>
  ) => Promise<TRet>
) {
  return (state: TRet | undefined, data: FormData) => {
    return handler(() => parseFormData(data, schema));
  };
}
