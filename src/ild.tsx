import { Hono } from "hono";
import { renderer } from "./renderer";
import { serviceList } from "./services";

const app = new Hono();

// Serve static files from the "public/static" directory under the "/static" path
app.use(renderer);

// Define routes
app.get("/", (c) => {
	return c.render(
		<main>
			<header>
				<img src="/static/logo.svg" alt="DevBF Logo" id="logo" />
				<h2>DevBF</h2>
			</header>
			<h1>Access Services</h1>
			<p>
				Enter your access code to proceed or select a service from the
				list below.
			</p>
			<form action="/submit">
				<label htmlFor="access-code">Access Code:</label>
				<input
					type="text"
					id="access-code"
					name="access-code"
					required
					pattern="[a-zA-Z0-9\-]+"
					oninput="this.form.action = '/' + this.value;"
				/>
				<button type="submit">Submit</button>
			</form>

			<div className="or-divider">OR</div>

			<nav>
				<ul className="service-list">
					{serviceList.map(({ title, url }) => (
						<li key={url}>
							<a href={url}>{title}</a>
						</li>
					))}
				</ul>
			</nav>
		</main>
	);
});

// 404 Not Found Handler
app.all("*", (c) => {
	return c.render(
		<main>
			<header>
				<img src="/static/logo.svg" alt="DevBF Logo" id="logo" />
				<h2>DevBF</h2>
			</header>
			<h1>404 - Page Not Found</h1>
			<p>
				It looks like your access code isn't quite right. Please
				double-check and try again.
			</p>
			<a href="/">Go Back to Home</a>
		</main>
	);
});

export default app;
