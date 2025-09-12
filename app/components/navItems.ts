export type NavItem = {
  label: string;
  iconPath: string;
  href?: string;
};

export const navItems: NavItem[] = [
  {
    label: "Home",
    iconPath: "M3 12l9-7 9 7v8a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1v-8z",
    href: "/start",
  },
  {
    label: "Resources",
    iconPath: "M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h16v2H4v-2z",
  },
  {
    label: "Quick Test",
    iconPath: "M12 2a10 10 0 100 20 10 10 0 000-20zm1 5h-2v6l5 3 .9-1.5-3.9-2.3V7z",
  },
  {
    label: "Help",
    iconPath: "M12 2a10 10 0 100 20 10 10 0 000-20zm0 15a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm0-2a1 1 0 01-1-1c0-2 3-2 3-5a3 3 0 10-6 0H6a6 6 0 1112 0c0 4-4 4-4 6a1 1 0 01-1 1z",
  },
];
