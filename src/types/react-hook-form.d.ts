declare module "react-hook-form" {
  import type { Ref } from "react";

  export type UseFormReturn<TFieldValues> = {
    control: unknown;
    handleSubmit: (fn: (data: TFieldValues) => void | Promise<void>) => (e?: React.BaseSyntheticEvent) => Promise<void>;
    reset: (values?: Partial<TFieldValues>) => void;
    formState: { errors: Record<string, { message?: string }> };
    getFieldState: (
      name: string,
      formState: { errors: Record<string, { message?: string }> }
    ) => { error?: { message?: string } };
  };

  export type ControllerRenderProps<TFieldValues, TName> = {
    value: TFieldValues[TName & keyof TFieldValues];
    onChange: (value: TFieldValues[TName & keyof TFieldValues]) => void;
    onBlur: () => void;
    ref: Ref<HTMLInputElement>;
    name: string;
  };

  export function useForm<TFieldValues>(options?: {
    resolver?: unknown;
    defaultValues?: Partial<TFieldValues>;
  }): UseFormReturn<TFieldValues>;

  export const FormProvider: React.ComponentType<{ children: React.ReactNode } & Record<string, unknown>>;
  export const Controller: React.ComponentType<unknown>;
  export function useFormContext<T>(): UseFormReturn<T>;
}




