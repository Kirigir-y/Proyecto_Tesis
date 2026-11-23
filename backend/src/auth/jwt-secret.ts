export const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) {
    throw new Error(
      'Falta la variable JWT_SECRET. Defínela en el archivo .env (Docker) o en backend/.develop.env.',
    );
  }
  return secret;
};
