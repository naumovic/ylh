export function Footer() {
  return (
    <footer className="border-t border-hairline mt-10">
      <div className="mx-auto max-w-3xl px-5 py-6 text-xs text-muted flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <span>© {new Date().getFullYear()} Your Local Hero</span>
        <nav className="flex gap-4">
          <a href="/privacy" className="hover:text-navy-900 underline underline-offset-2">Privacy</a>
          <a href="/terms" className="hover:text-navy-900 underline underline-offset-2">Terms</a>
        </nav>
        <span className="sm:ml-auto">General information only, not financial or product advice.</span>
      </div>
    </footer>
  );
}
