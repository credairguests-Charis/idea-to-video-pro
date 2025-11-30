# Waitlist Subdomain DNS Configuration

This guide explains how to set up the `waitlist.usecharis.com` subdomain to point to your Lovable-hosted waitlist landing page.

## Overview

The Charis waitlist landing page is configured to automatically detect when visitors arrive via the `waitlist.usecharis.com` subdomain and display the waitlist page at the root URL.

## DNS Configuration Steps

### 1. Access Your DNS Provider

Log in to your domain registrar or DNS provider (e.g., Cloudflare, GoDaddy, Namecheap, Route53, etc.) where `usecharis.com` is managed.

### 2. Add DNS Records

Add the following DNS records for the waitlist subdomain:

#### A Record (Required)
| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | waitlist | 185.158.133.1 | 3600 (or Auto) |

#### TXT Record for Verification (Required)
| Type | Name | Value | TTL |
|------|------|-------|-----|
| TXT | _lovable.waitlist | lovable_verify=[YOUR_VERIFICATION_CODE] | 3600 (or Auto) |

> **Note:** You'll receive the verification code from Lovable when you connect the custom domain in your project settings.

### 3. Connect Domain in Lovable

1. Go to your Lovable project settings
2. Navigate to **Settings** → **Domains**
3. Click **Connect Domain**
4. Enter: `waitlist.usecharis.com`
5. Follow the instructions to complete verification
6. Lovable will automatically provision SSL (HTTPS) for your subdomain

### 4. DNS Propagation

- DNS changes can take **5 minutes to 72 hours** to fully propagate
- Use [DNSChecker.org](https://dnschecker.org) to verify your DNS records are live globally
- Once propagated, `waitlist.usecharis.com` will automatically serve the waitlist page

## Verification

After DNS propagation completes, verify the setup:

1. Visit `https://waitlist.usecharis.com` in your browser
2. Confirm the waitlist landing page loads (not the main Charis app)
3. Verify SSL certificate is valid (HTTPS padlock icon)
4. Test the waitlist signup form

## Troubleshooting

### Domain Not Resolving

**Problem:** `waitlist.usecharis.com` doesn't load after 24-48 hours

**Solutions:**
- Verify the A record points to `185.158.133.1` (not `www.waitlist` or other values)
- Check for conflicting DNS records (CNAME, AAAA, or duplicate A records)
- Clear your local DNS cache:
  - **Windows:** `ipconfig /flushdns`
  - **Mac:** `sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder`
  - **Linux:** `sudo systemd-resolve --flush-caches`

### SSL Certificate Issues

**Problem:** "Not Secure" warning or SSL errors

**Solutions:**
- Wait 10-30 minutes after DNS verification for SSL provisioning
- If you have CAA records, ensure they allow Let's Encrypt:
  ```
  0 issue "letsencrypt.org"
  0 issuewild "letsencrypt.org"
  ```
- Check Lovable project settings to confirm domain status is "Active"

### Wrong Page Displaying

**Problem:** Main Charis app appears instead of waitlist page

**Solutions:**
- Verify you're accessing `waitlist.usecharis.com` (not `www.waitlist.usecharis.com`)
- Clear browser cache and cookies
- Try in incognito/private browsing mode
- Check domain status in Lovable dashboard

### Form Submissions Not Working

**Problem:** Waitlist form doesn't submit or shows errors

**Solutions:**
- Verify Supabase `waitlist_signups` table exists
- Check RLS policies allow anonymous inserts
- Open browser console (F12) to check for JavaScript errors
- Verify network requests are reaching Supabase (Network tab)

## Advanced Configuration (Optional)

### Redirect www Subdomain

If you want `www.waitlist.usecharis.com` to redirect to `waitlist.usecharis.com`:

1. Add a CNAME record:
   | Type | Name | Value | TTL |
   |------|------|-------|-----|
   | CNAME | www.waitlist | waitlist.usecharis.com | 3600 |

2. Configure redirect in Lovable domain settings (set `waitlist.usecharis.com` as Primary)

### Analytics Integration

To track traffic from the waitlist subdomain separately:

1. Add Google Analytics or Plausible to `src/pages/Waitlist.tsx`
2. Use `window.location.hostname` to identify traffic source
3. Set up conversion tracking for form submissions

## Testing Checklist

Before going live, verify:

- [ ] DNS records configured correctly
- [ ] Domain shows "Active" status in Lovable
- [ ] HTTPS works without warnings
- [ ] Waitlist page loads (not main app)
- [ ] Mobile responsive design works
- [ ] Form submissions save to Supabase
- [ ] Success message displays after signup
- [ ] Email validation works
- [ ] SEO metadata is present (view page source)

## Support

- **Lovable Docs:** [https://docs.lovable.dev/features/custom-domain](https://docs.lovable.dev/features/custom-domain)
- **DNS Checker:** [https://dnschecker.org](https://dnschecker.org)
- **SSL Checker:** [https://www.ssllabs.com/ssltest/](https://www.ssllabs.com/ssltest/)

## Maintenance

### Monitoring

- Set up uptime monitoring (e.g., UptimeRobot, Pingdom)
- Monitor form submission rate in Supabase dashboard
- Check DNS record TTL and renewal dates

### Updates

When updating the waitlist page:
- Changes deploy automatically via Lovable
- No DNS changes needed for content updates
- Test in preview before publishing

---

**Last Updated:** 2025-11-30  
**Subdomain:** waitlist.usecharis.com  
**Lovable IP:** 185.158.133.1
