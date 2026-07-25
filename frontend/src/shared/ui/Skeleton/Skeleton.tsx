type SkeletonProps = {
  className?: string;
};

// Серый блок-заглушка под будущий контент. Размер задаётся через className.
export function Skeleton({ className }: SkeletonProps) {
  return <div aria-hidden="true" className={["skeleton", className].filter(Boolean).join(" ")} />;
}
