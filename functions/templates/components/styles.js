export function Styles() {
    return `
        :root {
            --background: 240 10% 3.9%;
            --foreground: 0 0% 98%;
            --card: 240 10% 6%;
            --primary: 24 100% 50%;
            --primary-foreground: 0 0% 100%;
            --secondary: 240 3.7% 15.9%;
            --secondary-foreground: 0 0% 98%;
            --muted: 240 3.7% 15.9%;
            --muted-foreground: 240 5% 64.9%;
            --border: 240 3.7% 15.9%;
            --radius: 0.5rem;
        }

        :root.light {
            --background: 0 0% 100%;
            --foreground: 240 10% 3.9%;
            --card: 0 0% 98%;
            --primary: 24 100% 50%;
            --primary-foreground: 0 0% 100%;
            --secondary: 240 4.8% 95.9%;
            --secondary-foreground: 240 5.9% 10%;
            --muted: 240 4.8% 95.9%;
            --muted-foreground: 240 3.8% 46.1%;
            --border: 240 5.9% 90%;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif;
            background-color: hsl(var(--background));
            color: hsl(var(--foreground));
            line-height: 1.4;
            font-size: 0.9375rem;
            transition: background-color 0.3s ease, color 0.3s ease;
        }

        body.mobile-menu-open {
            overflow: hidden;
            position: fixed;
            width: 100%;
            height: 100%;
        }

        .container {
            max-width: 1000px;
            margin: 0 auto;
            padding: 0 0.75rem;
        }

        header {
            position: sticky;
            top: 0;
            z-index: 100;
            background-color: hsla(var(--background), 0.9);
            backdrop-filter: blur(8px);
            border-bottom: 1px solid hsl(var(--border));
            transition: background-color 0.3s ease;
        }

        .header-content {
            height: 50px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .logo {
            display: flex;
            align-items: center;
            gap: 0.35rem;
            text-decoration: none;
            color: hsl(var(--foreground));
            font-weight: 700;
            font-size: 1.1rem;
            position: relative;
        }

        .logo img {
            height: 32px;
            max-width: 140px;
            object-fit: contain;
            filter: brightness(1);
            transition: filter 0.3s ease;
        }

        :root.light .logo img {
            filter: brightness(0.8);
        }

        .logo span {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0 0 0 0);
            white-space: nowrap;
            border: 0;
        }

        .nav-links {
            display: none;
            gap: 1rem;
        }

        @media (min-width: 768px) {
            .nav-links {
                display: flex;
            }
        }

        .nav-links a {
            text-decoration: none;
            color: hsl(var(--foreground) / 0.8);
            font-size: 0.8125rem;
            font-weight: 500;
            transition: color 0.2s;
        }

        .nav-links a:hover {
            color: hsl(var(--primary));
        }

        .nav-links a:active,
        .nav-links a.active {
            color: hsl(var(--foreground));
        }

        .actions {
            display: flex;
            align-items: center;
            gap: 0.25rem;
        }

        button.icon-btn {
            background: none;
            border: none;
            padding: 0.4rem;
            border-radius: calc(var(--radius) - 2px);
            color: hsl(var(--foreground));
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s, color 0.3s ease;
        }

        button.icon-btn:hover {
            background-color: hsl(var(--secondary));
        }

        button.icon-btn svg {
            width: 18px;
            height: 18px;
            transition: transform 0.3s ease;
        }

        button.icon-btn:active svg {
            transform: scale(0.9);
        }

        .mobile-menu-btn {
            display: flex !important;
        }

        @media (min-width: 768px) {
            .mobile-menu-btn {
                display: none !important;
            }
        }

        .mobile-menu {
            position: fixed;
            top: 0;
            left: -300px;
            width: 280px;
            height: 100vh;
            background-color: hsl(var(--card));
            border-right: 1px solid hsl(var(--border));
            z-index: 1000;
            transition: left 0.3s ease-in-out;
            display: flex;
            flex-direction: column;
            padding: 1rem;
            box-shadow: 2px 0 10px rgba(0, 0, 0, 0.3);
        }

        .mobile-menu.active {
            left: 0;
        }

        .mobile-menu-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid hsl(var(--border));
        }

        .mobile-menu-title {
            font-weight: 700;
            font-size: 1rem;
            color: hsl(var(--foreground));
            display: flex;
            align-items: center;
        }

        .mobile-menu-links {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
            flex: 1;
        }

        .mobile-menu-links a {
            text-decoration: none;
            color: hsl(var(--foreground));
            font-size: 0.9375rem;
            padding: 0.75rem;
            border-radius: var(--radius);
            transition: background-color 0.2s, color 0.2s;
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }

        .mobile-menu-links a:hover {
            background-color: hsl(var(--primary));
            color: white;
        }

        .mobile-menu-links a svg {
            width: 18px;
            height: 18px;
        }

        .mobile-menu-footer {
            margin-top: auto;
            padding-top: 1rem;
            border-top: 1px solid hsl(var(--border));
            font-size: 0.75rem;
            color: hsl(var(--muted-foreground));
            text-align: center;
        }

        .menu-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 999;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.3s, visibility 0.3s;
            backdrop-filter: blur(2px);
        }

        .menu-overlay.active {
            opacity: 1;
            visibility: visible;
        }

        main {
            padding: 0.75rem 0;
            transition: filter 0.3s;
        }

        main.menu-open {
            filter: blur(2px);
        }

        .breadcrumbs {
            padding: 0.5rem 0;
            font-size: 0.75rem;
            color: hsl(var(--muted-foreground));
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .breadcrumbs a {
            color: inherit;
            text-decoration: none;
            transition: color 0.2s;
        }

        .breadcrumbs a:hover {
            color: hsl(var(--primary));
        }

        .player-section {
            background-color: hsl(var(--card));
            border-radius: var(--radius);
            border: 1px solid hsl(var(--border));
            overflow: hidden;
            margin-bottom: 1.25rem;
            transition: background-color 0.3s ease, border-color 0.3s ease;
        }

        .video-wrapper {
            position: relative;
            aspect-ratio: 16/9;
            background-color: #000;
        }

        .video-placeholder {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
}

        .play-overlay {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0, 0, 0, 0);
            cursor: pointer;
            border: 0;
            width: 100%;
            text-align: center;
        }

        .play-overlay:focus {
            outline: 2px solid hsl(var(--primary));
        }

        .play-btn-large {
            width: 60px;
            height: 60px;
            background: hsla(0, 0%, 0%, 0.58);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            pointer-events: none;
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
            transition: transform 0.2s ease;
        }

        .play-overlay:hover .play-btn-large {
            transform: scale(1.1);
        }

        .play-btn-large svg {
            width: 28px;
            height: 28px;
            margin-left: 3px;
            fill: white;
            color: white;
        }

        .video-info {
            padding: 0.75rem 1rem;
        }

        .video-title {
            font-size: 1.125rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
            line-height: 1.3;
        }

        .video-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            margin-bottom: 0.5rem;
        }

        .badge {
            background-color: hsl(var(--secondary));
            color: hsl(var(--secondary-foreground));
            padding: 0.15rem 0.5rem;
            border-radius: 4px;
            font-size: 0.6875rem;
            font-weight: 600;
            display: inline-flex;
            align-items: center;
            gap: 0.25rem;
            transition: background-color 0.3s ease, color 0.3s ease;
        }

        .badge svg {
            width: 12px;
            height: 12px;
        }

        .video-description {
            margin: 0.75rem 0 0.5rem 0;
            padding: 0.75rem;
            background-color: hsl(var(--secondary));
            border-radius: var(--radius);
            border-left: 4px solid hsl(var(--primary));
            font-size: 0.8125rem;
            line-height: 1.5;
            color: hsl(var(--secondary-foreground));
            transition: background-color 0.3s ease, color 0.3s ease;
            position: relative;
        }

        .tag-link {
            color: hsl(var(--muted-foreground));
            text-decoration: none;
            transition: color 0.2s;
            display: inline-block;
            margin-right: 0.25rem;
        }

        .tag-link:hover {
            color: hsl(var(--primary));
            text-decoration: underline;
        }

        .read-more-content {
            max-height: 75px;
            overflow: hidden;
            transition: max-height 0.3s ease;
            position: relative;
        }

        .read-more-content.expanded {
            max-height: 2000px; /* Large enough to show all content */
        }

        .read-more-overlay {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 40px;
            background: linear-gradient(transparent, hsl(var(--secondary)));
            pointer-events: none;
            transition: opacity 0.3s ease;
        }

        .read-more-content.expanded .read-more-overlay {
            opacity: 0;
        }

        .read-more-btn {
            display: inline-block;
            margin-top: 0.5rem;
            background: none;
            border: none;
            color: hsl(var(--primary));
            font-weight: 700;
            cursor: pointer;
            padding: 0;
            font-size: 0.75rem;
        }

        .video-description p {
            margin-bottom: 0.25rem;
        }

        .video-description strong {
            color: hsl(var(--primary));
        }

        .btn-group {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            margin-top: 0.75rem;
        }

        .btn {
            padding: 0.4rem 0.8rem;
            border-radius: var(--radius);
            font-weight: 600;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 0.35rem;
            border: 1px solid transparent;
            font-size: 0.75rem;
            text-decoration: none;
            transition: opacity 0.2s, background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease;
        }

        .btn:hover {
            opacity: 0.9;
        }

        .btn svg {
            width: 14px;
            height: 14px;
        }

        .btn-primary {
            background-color: hsl(var(--primary));
            color: hsl(var(--primary-foreground));
        }

        .btn-outline {
            background: transparent;
            border-color: hsl(var(--border));
            color: hsl(var(--foreground));
        }

        .btn-outline:hover {
            background-color: hsl(var(--secondary));
        }

        .section-title {
            font-size: 0.9375rem;
            font-weight: 700;
            margin-bottom: 0.75rem;
            display: flex;
            align-items: center;
            gap: 0.4rem;
        }

        .section-title svg {
            width: 16px;
            height: 16px;
            color: hsl(var(--primary));
        }

        .video-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 0.75rem;
        }

        .video-card {
            background-color: hsl(var(--card));
            border-radius: var(--radius);
            border: 1px solid hsl(var(--border));
            overflow: hidden;
            transition: border-color 0.2s, transform 0.2s, background-color 0.3s ease;
            text-decoration: none;
            color: inherit;
            display: block;
        }

        .video-card:hover {
            border-color: hsl(var(--primary));
            transform: translateY(-2px);
        }

        .video-card-link {
            text-decoration: none;
            color: inherit;
            display: block;
        }

        .card-thumb {
            position: relative;
            aspect-ratio: 16/9;
            background-color: hsl(var(--muted));
        }

        .card-thumb img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .card-duration {
            position: absolute;
            bottom: 4px;
            right: 4px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            font-size: 0.625rem;
            padding: 1px 4px;
            border-radius: 2px;
        }

        .card-views {
            position: absolute;
            bottom: 4px;
            left: 4px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            font-size: 0.625rem;
            padding: 1px 4px;
            border-radius: 2px;
            display: flex;
            align-items: center;
            gap: 3px;
        }

        .card-views svg {
            width: 10px;
            height: 10px;
        }

        .card-hover-overlay {
            position: absolute;
            inset: 0;
            background: rgba(0, 0, 0, 0.3);
            opacity: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: opacity 0.2s;
            color: white;
        }

        .video-card:hover .card-hover-overlay {
            opacity: 1;
        }

        .card-hover-overlay svg {
            width: 2.5rem;
            height: 2.5rem;
        }

        .card-content {
            padding: 0.5rem;
        }

        .card-title {
            font-size: 0.8125rem;
            font-weight: 600;
            margin-bottom: 0.15rem;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            line-height: 1.3;
            color: hsl(var(--foreground));
            text-decoration: none;
            transition: color 0.3s ease;
        }

        .card-stats {
            font-size: 0.6875rem;
            color: hsl(var(--muted-foreground));
            transition: color 0.3s ease;
        }

        .pagination {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 1rem;
            margin-top: 2rem;
        }

        .pagination-link {
            padding: 0.5rem 1rem;
            background-color: hsl(var(--secondary));
            color: hsl(var(--foreground));
            text-decoration: none;
            border-radius: var(--radius);
            font-size: 0.875rem;
            transition: background-color 0.2s, color 0.3s ease;
        }

        .pagination-link:hover {
            background-color: hsl(var(--primary));
            color: white;
        }

        .pagination-current {
            color: hsl(var(--muted-foreground));
            font-size: 0.875rem;
            transition: color 0.3s ease;
        }

        .pagination-next {
            background-color: hsl(var(--primary));
            color: white;
        }

        footer {
            margin-top: 2rem;
            padding: 1rem 0;
            border-top: 1px solid hsl(var(--border));
            text-align: center;
            color: hsl(var(--muted-foreground));
            font-size: 0.75rem;
            transition: border-color 0.3s ease, color 0.3s ease;
        }

        .modal {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(4px);
            z-index: 2000;
            display: none;
            align-items: center;
            justify-content: center;
            padding: 1rem;
        }

        .modal.active {
            display: flex;
        }

        .modal-content {
            background-color: hsl(var(--background));
            width: 100%;
            max-width: 400px;
            border-radius: var(--radius);
            padding: 1rem;
            border: 1px solid hsl(var(--border));
            position: relative;
            transition: background-color 0.3s ease, border-color 0.3s ease;
        }

        .close-modal {
            position: absolute;
            top: 0.5rem;
            right: 0.5rem;
            background: none;
            border: none;
            cursor: pointer;
            color: hsl(var(--muted-foreground));
        }

        .search-form {
            display: flex;
            gap: 0.5rem;
            margin-top: 0.75rem;
        }

        .search-input {
            flex: 1;
            padding: 0.5rem;
            border-radius: var(--radius);
            border: 1px solid hsl(var(--border));
            background: hsl(var(--secondary));
            color: hsl(var(--foreground));
            font-size: 0.875rem;
            transition: background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease;
        }

        .search-input::placeholder {
            color: hsl(var(--muted-foreground));
        }

        img.error-fallback {
            background-color: hsl(var(--muted));
            object-fit: cover;
        }

        .search-input:focus {
            outline: 2px solid hsl(var(--primary));
        }

.ad-container {
    width: 100%;
    max-width: 300px;
    margin: 0 auto;
    position: relative;
    overflow: hidden;
    background-color: #f0f0f0
}

.ad-container img {
    width: 100%;
    height: auto;
    display: block;
    opacity: 0;
    transition: opacity 0.3s ease-in-out
}

.ad-container.lazy-loaded img {
    opacity: 1
}

.ad-container {
    width: auto;
    height: auto;
    position: fixed;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    background-color: hsla(var(--background), 0.95);
    box-shadow: 0 4px 8px rgb(0 0 0 / .1);
    border-radius: 8px;
    border: 1px solid hsl(var(--border));
    z-index: 1000;
    display: none
}

.close-btn {
    position: absolute;
    top: 5px;
    right: 5px;
    background: hsla(var(--background), 0.8);
    border: 1px solid hsl(var(--border));
    border-radius: 50%;
    width: 24px;
    height: 24px;
    font-size: 14px;
    cursor: pointer;
    color: hsl(var(--foreground));
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s, color 0.2s
}

        /* Dropdown Styles */
        .dropdown {
            position: relative;
            display: inline-block;
        }
        .dropdown-content {
            display: none;
            position: absolute;
            background-color: var(--nav-bg, #1f1f1f);
            min-width: 160px;
            box-shadow: 0 8px 16px 0 rgb(0 0 0 / 0.5);
            z-index: 1000;
            border-radius: 8px;
            overflow: hidden;
            top: 100%;
            left: 0;
        }
        .dropdown-content a {
            color: var(--text, #fff);
            padding: 10px 16px;
            text-decoration: none;
            display: block;
            font-size: 14px;
        }
        .dropdown-content a:hover {
            background-color: var(--accent, #e50914);
            color: #fff;
        }
        .dropdown:hover .dropdown-content {
            display: block;
        }

        @media (max-width: 480px) {
            .video-grid {
                grid-template-columns: repeat(2, 1fr);
                gap: 0.5rem;
            }
            
            .video-description {
                font-size: 0.75rem;
            }
            
            .badge {
                font-size: 0.625rem;
            }
        }
        .back-to-top {
            position: fixed;
            bottom: 2rem;
            right: 1.5rem;
            width: 40px;
            height: 40px;
            background-color: hsl(var(--primary));
            color: hsl(var(--primary-foreground));
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 99;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            border: none;
            outline: none;
        }

        .back-to-top.visible {
            opacity: 1;
            visibility: visible;
            transform: translateY(0);
        }

        .back-to-top:hover {
            transform: translateY(-5px);
            background-color: hsl(var(--primary), 0.9);
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
        }

        @media (max-width: 768px) {
            .back-to-top {
                bottom: 5.5rem;
                right: 1rem;
                width: 36px;
                height: 36px;
            }
        }
    `;
}
