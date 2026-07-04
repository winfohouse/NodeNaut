# Privacy Policy for FlowPilot

**Effective Date:** July 4, 2026

FlowPilot ("we", "our", or "the Extension") is committed to protecting your privacy. This Privacy Policy explains how your data is handled when you use the FlowPilot browser extension.

Because FlowPilot is designed as a local-first browser automation tool, our privacy principles are very simple: **We do not collect, transmit, store, or sell your personal data.**

## 1. Local Data Storage

All data generated, recorded, or saved by FlowPilot resides **100% locally on your machine**. 
- **Workflows & Data Tables:** Your automation workflows, scraped data, and execution logs are stored locally within your browser using standard Web APIs (IndexedDB).
- **Settings & Preferences:** Extension preferences are stored in your browser's local storage (`chrome.storage.local`).
- **Encrypted Vault:** If you use the FlowPilot Vault to store sensitive information (such as API keys, passwords, or secure datasets), the data is encrypted on your machine using AES-256-GCM. The decryption key is derived from your master password and is never saved to disk or transmitted over the network. 

We have no servers, no databases, and no cloud infrastructure that receives your data.

## 2. No Analytics or Tracking

FlowPilot contains **zero** third-party analytics trackers, crash reporters, or telemetry scripts (e.g., no Google Analytics, Mixpanel, or Sentry). We do not track how you use the extension, which websites you automate, or what data you extract.

## 3. Network and API Communications

FlowPilot only makes network requests under the following conditions, strictly dictated by you:
- **Your Workflows:** If you explicitly write a workflow or FlowScript code that makes an HTTP request to an external server or API (e.g., a webhook), that request is made directly from your browser to your chosen destination.
- **Model Context Protocol (MCP):** If you choose to run the local MCP companion server to allow AI agents (like Claude Desktop) to interact with FlowPilot, the communication occurs entirely on your local machine (via `localhost` WebSocket on port 7865).

We do not intercept, proxy, or log these requests. 

## 4. Required Browser Permissions

To provide its core automation features, FlowPilot requires several browser permissions. Here is why we need them:

- **`activeTab` & `tabs`:** Required to navigate, spawn new tabs, and execute your automation workflows on the websites you specify.
- **`scripting`:** Required to inject the content script into web pages so FlowPilot can interact with the DOM (clicking buttons, typing text, scanning elements) on your behalf.
- **`storage`:** Required to save your workflows, settings, and encrypted vault locally.
- **`offscreen`:** Required to run a secure, sandboxed JavaScript environment where your custom FlowScript code can execute without accessing the host page directly.
- **`webNavigation`:** Required to detect when single-page applications (SPAs) load dynamic content so workflows wait for the page to stabilize.

## 5. Changes to this Privacy Policy

We may update this Privacy Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. Any changes will be updated directly in this repository and within the extension.

## 6. Contact

If you have any questions about this Privacy Policy or how your data is handled, please open an issue on our GitHub repository.
