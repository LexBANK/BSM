export function audit(
  action: string,
  actor: string,
  details: Record<string, unknown>
) {
  const entry = {
    timestamp: new Date().toISOString(),
    action,
    actor,
    details,
  };

  // لاحقًا: Prisma / DB
  console.log(JSON.stringify(entry));
}
