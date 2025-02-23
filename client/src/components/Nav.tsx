function Nav({ user, signOut, signIn }) {
  return (
    <nav>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" onClick={user ? signOut : signIn}>
          {user ? 'Sign out' : 'Sign in'}
        </Button>
      </div>
    </nav>
  );
}