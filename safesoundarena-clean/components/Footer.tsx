export default function Footer() {
  return (
    <footer className="w-full border-t border-gray-200 dark:border-gray-800 text-xs text-gray-500 py-6">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
        <span>© {new Date().getFullYear()} SafeSoundArena</span>
        <div className="flex gap-3">
          <a href="/privacy-policy-en.md" className="hover:underline">
            Privacy
          </a>
          <a href="/terms-of-service-en.md" className="hover:underline">
            Terms
          </a>
        </div>
      </div>
    </footer>
  );
}
