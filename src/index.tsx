import { Hono } from "hono";
import { renderer } from "./renderer";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { serviceList } from "./services";

type Bindings = {
  KV: KVNamespace;
  API_KEY: string; // Reintroduced API_KEY
  // Removed API_SECRET as they are no longer needed
};

const app = new Hono<{
  Bindings: Bindings;
}>();

// Serve static files from the "public/static" directory under the "/static" path
app.use(renderer);

// Define routes
app.get("/", (c) => {
  return c.render(
    <div>
      <h1>Access Services</h1>
      <p>
        Enter your access code to proceed or select a service from the
        list below.
      </p>
      <form
        action="/"
      >
        <label htmlFor="access-code">Access Code:</label>
        <input
          type="text"
          id="access-code"
          name="access-code"
          required
          pattern="[A-Za-z0-9\-]+"
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
    </div>
  );
});

app.get("/internal/create", (c) => {
  return c.render(
    <main>
      <h2>Create Shorten URL!</h2>
      <form action="/internal/create" method="post">
        <label htmlFor="url">URL:</label>
        <input
          type="url"
          name="url"
          id="url"
          autocomplete="off"
          required
          placeholder="https://example.com"
        />

        <label htmlFor="toggle-custom-code">
          <input type="checkbox" id="toggle-custom-code" />
          Use Custom Code
        </label>

        <div id="custom-code-container" style="display: none; margin-top: 10px;">
          <label htmlFor="customCode">Custom Code:</label>
          <input
            type="text"
            name="customCode"
            id="customCode"
            pattern="[A-Za-z0-9\-]+"
            title="Alphanumeric characters and hyphens only"
            disabled
          />
        </div>

        <button type="submit" style="margin-top: 15px;">Create</button>
      </form>

      <script src="/static/internalCreate.js"></script>
    </main>
  );
});

// Define schema with optional customCode
const schema = z.object({
  url: z.string().url(),
  customCode: z
    .string()
    .optional()
    .refine((code) => /^[A-Za-z0-9\-]+$/.test(code), {
      message: "Invalid custom code format.",
    }),
});

const validator = zValidator("form", schema, (result, c) => {
  if (!result.success) {
    return c.render(
      <div>
        <h2>Error!</h2>
        <ul>
          {result.error.errors.map((err) => (
            <li key={err.path.join(".")}>{err.message}</li>
          ))}
        </ul>
        <a href="/internal/create">Back to Create</a>
      </div>
    );
  }
});

// Enhanced createKey function with longer, mixed-case keys and retry limit
const generateRandomKey = (length: number = 8): string => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let key = "";
  for (let i = 0; i < length; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
};

const createKey = async (
  kv: KVNamespace,
  url: string,
  customCode?: string
): Promise<string> => {
  if (customCode) {
    const exists = await kv.get(customCode);
    if (exists) {
      throw new Error("Custom code already exists.");
    }
    await kv.put(customCode, url);
    return customCode;
  } else {
    const MAX_ATTEMPTS = 5;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const key = generateRandomKey(8); // Generate 8-character key
      const exists = await kv.get(key);
      if (!exists) {
        await kv.put(key, url);
        return key;
      }
    }
    throw new Error("Failed to generate a unique key. Please try again.");
  }
};

// POST route to create shortened URL with optional custom code
app.post("/internal/create", validator, async (c) => {
  const { url, customCode } = c.req.valid("form");
  try {
    const key = await createKey(c.env.KV, url, customCode);
    const shortenUrl = new URL(`/${key}`, c.req.url!); // Non-null assertion

    return c.render(
      <div>
        <h2>Created!</h2>
        <input
          type="text"
          value={shortenUrl.toString()}
          readOnly
          autoFocus
        />
        <a href="/internal/create">Back to Create</a>
      </div>
    );
  } catch (error: any) {
    return c.render(
      <div>
        <h2>Error!</h2>
        <p>{error.message}</p>
        <a href="/internal/create">Back to Create</a>
      </div>
    );
  }
});

// API Endpoint to create shortened URL with API key check
app.post("/api/shorten", async (c) => {
  const apiKey = c.req.header("X-API-KEY");
  if (!apiKey || apiKey !== c.env.API_KEY) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const contentType = c.req.header("Content-Type") || "";
  let body: any;

  if (contentType.includes("application/json")) {
    body = await c.req.json();
  } else if (contentType.includes("application/x-www-form-urlencoded")) {
    body = await c.req.parseBody();
  } else {
    return c.json({ error: "Unsupported Content-Type" }, 415);
  }

  const { url, customCode } = body;

  // Validate input
  const parseResult = schema.safeParse({ url, customCode });
  if (!parseResult.success) {
    return c.json({ errors: parseResult.error.errors }, 400);
  }

  try {
    const key = await createKey(c.env.KV, parseResult.data.url, parseResult.data.customCode);
    const shortenUrl = new URL(`/${key}`, c.req.url!); // Non-null assertion
    return c.json({ shortUrl: shortenUrl.toString() }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

// URL Shortener Functionality
app.get("/:key", async (c) => {
  const key = c.req.param("key");
  const url = await c.env.KV.get(key);
  

  if (url === null) {
    return c.notFound();
  }
  
  const urlObject = new URL(url);
  //add code parameter
  urlObject.searchParams.set("accessCode", key);
  //show warning page if url is not *.devbf.com and referer is devbf.com
  if (!urlObject.hostname.endsWith(".devbf.com") && c.req.header("Referer")?.includes("devbf.com")) {
    return c.render(
      <main>
        <h1>Warning</h1>
        <p>You are about to be redirected to a URL that is not a DevBF service.</p>
        <a href={urlObject.toString()}>Continue</a>
      </main>
    );
  }else{
    return c.redirect(urlObject.toString());
  }
});

// 404 Not Found Handler
app.notFound((c) => {
  return c.render(
    <main>
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
