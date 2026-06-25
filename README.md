# rainbow

I create modern, responsive and high-converting websites for businesses and personal brands.
## Projects for now:
- Fitness Website
- Barbershop Website
- Rainbow Clean

# Request App

Simple form with client validation and Node/Express email sender.

Setup

1. Install dependencies:

```bash
npm init -y
npm install express nodemailer body-parser cors
```

2. Start server (set SMTP env vars first):

Windows PowerShell example:

```powershell
$env:SMTP_HOST='smtp.gmail.com'; $env:SMTP_PORT='465'; $env:SMTP_SECURE='true'; $env:SMTP_USER='your.email@gmail.com'; $env:SMTP_PASS='your_app_password'; $env:EMAIL_TO='daniel.mandazhiev09@gmail.com'
node server.js
```

Open http://localhost:3000/request-app/

To allow recipients to reply directly to the sender, the form now accepts a required contact email (`senderEmail`). The server sets `replyTo` on the notification email so you can contact the user easily.

The app also performs a live address lookup using OpenStreetMap Nominatim to verify the provided address is valid before sending the notification.
 
## Deploy to Render

1. Create a GitHub repository and push the contents of `request-app`.
2. Sign in to https://render.com and create a new Web Service.
3. Connect your GitHub repo and select the `request-app` folder if needed.
4. Set the build command to:
	```bash
	npm install
	```
5. Set the start command to:
	```bash
	node server.js
	```
6. Add environment variables in Render:
	- `SMTP_HOST`
	- `SMTP_PORT`
	- `SMTP_SECURE`
	- `SMTP_USER`
	- `SMTP_PASS`
	- `EMAIL_TO=daniel.mandazhiev09@gmail.com`
	- `PORT=3000`
7. Deploy and use the public URL from Render.

## Clean repo files
Keep only these files in the published folder:
 - `index.html`
 - `script.js`
 - `server.js`
 - `package.json`
 - `package-lock.json`
 - `.env.example`
 - `.gitignore`
