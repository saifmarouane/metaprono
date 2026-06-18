declare module "@hookform/resolvers/zod" {
  import type { Resolver } from "react-hook-form";
  import type { z } from "zod";

  export function zodResolver<T extends z.ZodType>(
    schema: T
  ): Resolver<z.infer<T>>;
}




