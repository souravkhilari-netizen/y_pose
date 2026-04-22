import { NavLink } from 'react-router-dom';

function Header() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <NavLink to="/" className="brand">
          Yoga Pose Detection
        </NavLink>

        <nav className="main-nav" aria-label="Main navigation">
          <NavLink
            to="/"
            className={({ isActive }) => (isActive ? 'nav-link nav-link--active' : 'nav-link')}
          >
            Home
          </NavLink>
          <NavLink
            to="/poses"
            className={({ isActive }) => (isActive ? 'nav-link nav-link--active' : 'nav-link')}
          >
            Poses
          </NavLink>
        </nav>
      </div>
    </header>
  );
}

export default Header;
