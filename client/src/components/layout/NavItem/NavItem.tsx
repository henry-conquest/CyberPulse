import { cn } from '@/lib/utils';
import { Link } from 'wouter';

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  isActive?: boolean;
}

export const NavItem = ({ href, icon, children, isActive }: NavItemProps) => {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center space-x-2 px-3 py-2 rounded hover:bg-white/10 text-white/80',
        isActive && 'bg-white/15 text-white font-medium'
      )}
    >
      {icon}
      <span>{children}</span>
    </Link>
  );
};
