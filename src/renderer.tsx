// renderer.tsx
import { jsxRenderer } from "hono/jsx-renderer";

export const renderer = jsxRenderer(({ children }) => {
	return (
		<html lang="en">
			<head>
				<meta charSet="UTF-8" />
				<link
					rel="icon"
					href="/static/favicon.ico"
					type="image/x-icon"
				/>

				<meta
					name="viewport"
					content="width=device-width, initial-scale=1.0"
				/>
				<title>Portal</title>
				{/* Link to the external CSS file */}
				<link href="/static/style.css" rel="stylesheet" />
			</head>
			<body>
				<main>
					<header>
						<img
							src="/static/logo.svg"
							alt="DevBF Logo"
							id="logo"
						/>
						<h2>Portal</h2>
					</header>
					{children}
				</main>
			</body>
		</html>
	);
});
