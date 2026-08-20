import { simpleParser } from 'mailparser';
import { prisma } from '../db.js';
import { LeadCaptureService } from './lead-capture.service.js';

export type Platform = 'indiamart' | 'justdial' | 'tradeindia';

interface ParsedLead {
  name: string;
  phone: string;
  email: string;
  product: string;
  requirement: string;
  city: string;
  source: Platform;
}

/**
 * Unified Email Lead Capture Service
 * Supports IndiaMART, JustDial, and TradeIndia
 */
export class EmailLeadService {
  /**
   * Parse email based on platform
   */
  static parseEmail(html: string, text: string, platform: Platform): ParsedLead | null {
    const content = text || this.htmlToText(html);

    const parsers: Record<Platform, (content: string) => ParsedLead | null> = {
      indiamart: this.parseIndiaMART,
      justdial: this.parseJustDial,
      tradeindia: this.parseTradeIndia,
    };

    return parsers[platform](content);
  }

  /**
   * Parse IndiaMART email
   */
  static parseIndiaMART(content: string): ParsedLead | null {
    const result: ParsedLead = { name: '', phone: '', email: '', product: '', requirement: '', city: '', source: 'indiamart' };

    // Name - multiple patterns for IndiaMART format
    // Order matters: more specific patterns first, generic last
    const namePatterns = [
      // Pattern for 'Regards,\nName' at signature (buyer-direct format)
      // Use [^\S\n] (non-newline space) to prevent consuming across lines
      /Regards,\s*\n+\s*([A-Z][a-z]+(?:[^\S\n]+[A-Z][a-z]+)*)/i,
      // Pattern for 'Buyer\'s Contact Details:' format (actual IndiaMART email)
      /Buyer'?s Contact Details:[\s\S]*?\n([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\n/i,
      /Buyer\s+Name[:\s]*([^\n]+)/i,
      /Customer\s+Name[:\s]*([^\n]+)/i,
      /Contact\s+Person[:\s]*([^\n]+)/i,
      /Enquiry\s+from[:\s]*([^\n]+)/i,
      /Query\s+from\s+([^\n]+)/i,
      // Generic fallback - last resort (must be at start of line to avoid mid-email matches)
      /(?:Dear\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    ];
    // Remove the misleading Hi pattern - it captures the receiver's name not the buyer's
    for (const pattern of namePatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim();
        if (name.length > 2 && name.length < 50 && !name.toLowerCase().includes('indiamart') && name.toLowerCase() !== 'india') {
          result.name = name;
          break;
        }
      }
    }

    // Phone - multiple patterns
    const phones = content.match(/(?:\+?91[\s.-]?)?([6-9]\d{9})/g);
    if (phones) {
      for (const p of phones) {
        const clean = p.replace(/[\s.-]/g, '');
        if (clean.length >= 10) { result.phone = clean.slice(-10); break; }
      }
    }

    // Email - multiple patterns
    const emailPatterns = [
      /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
      /Email[:\s]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
      /Mail[:\s]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
    ];
    for (const pattern of emailPatterns) {
      const emails = content.match(pattern);
      if (emails) {
        const valid = emails.filter(e => 
          !e.includes('indiamart.com') && 
          !e.includes('noreply') && 
          !e.includes('justdial') && 
          !e.includes('tradeindia') &&
          !e.includes('support@')
        );
        if (valid.length > 0) {
          result.email = valid[0];
          break;
        }
      }
    }

    // Product - multiple patterns
    const productPatterns = [
      // 'looking for X' format (buyer-direct email)
      /looking\s+for\s+([\w\s\/\-\.\(\)\,]+?)(?:\.|\s+below|\s+I\s+am|\s*$)/i,
      // 'Buylead Details:' format (actual IndiaMART email)
      /Buylead\s+Details:\s*\n\s*\n?\s*([^\n]+)/i,
      /Requirement\s+for[:\s]*([^\n]+)/i,
      /Inquiry\s+for[:\s]*([^\n]+)/i,
      /Interested\s+in[:\s]*([^\n]+)/i,
      /Product\s+Name[:\s]*([^\n]+)/i,
      /Product[:\s]*([^\n]+)/i,
      /Looking\s+for[:\s]*([^\n]+)/i,
      /Want\s+to\s+buy[:\s]*([^\n]+)/i,
    ];
    for (const pattern of productPatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        result.product = match[1].trim().substring(0, 200);
        break;
      }
    }

    // Requirement/Message - capture details from the product section
    const reqPatterns = [
      // 'Below are my requirements' table format (buyer-direct email)
      /Below\s+(?:are\s+)?my\s+requirements[\s:]*(.*?)(?:Chat|Regards|Reply|Email:|Call\s+Us|Visit|IndiaMART|$)/is,
      // First try to capture all details after Buylead Details
      /Buylead\s+Details:[\s\S]*?(Output[\s\S]*?)(?:Reply|Email:|Call|Visit|IndiaMART recommends)/i,
      /Requirement[:\s]*([^\n]+)/i,
      /Query[:\s]*([^\n]+)/i,
      /Customer\s+Requirement[:\s]*([^\n]+)/i,
      /Description[:\s]*([^\n]+)/i,
      /Details[:\s]*([^\n]+)/i,
      // Message pattern - NOTE: must have at least one sep character after 'Message'
      /Message\s+[:\s]*([^\n]+)/i,
      /Message[:\s]+([^\n]+)/i,
    ];
    for (const pattern of reqPatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        result.requirement = match[1].trim().substring(0, 500);
        break;
      }
    }      // City - multiple patterns
    const cityPatterns = [
      // 'City, State, India' format (buyer-direct email signature)
      /([A-Z][a-z]+),\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?,\s*India/i,
      // 'City - Pincode' format (actual IndiaMART email: 'Surat - 395013')
      // Use [^\S\n] (non-newline whitespace) to prevent matching across lines
      /([A-Z][a-z]+(?:[^\S\n]+[A-Z][a-z]+)*)[^\S\n]*-\s*\d{5,6}/i,
      /City[:\s]*([A-Za-z\s]+?)(?:\n|$)/i,
      /Location[:\s]*([A-Za-z\s]+?)(?:\n|$)/i,
      /From[:\s]*([A-Za-z\s]+?)(?:\n|$)/i,
      /Buyer\s+City[:\s]*([A-Za-z\s]+?)(?:\n|$)/i,
      /Address[:\s]*([A-Za-z\s]+?)(?:\n|$)/i,
    ];
    for (const pattern of cityPatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        const city = match[1].trim();
        if (city.length > 2 && city.length < 50) {
          result.city = city;
          break;
        }
      }
    }

    // If we have at least phone or email, return the lead
    if (result.phone || result.email) {
      console.log(`[IndiaMART Parser] Found: name=${result.name}, phone=${result.phone}, email=${result.email}, product=${result.product}, city=${result.city}`);
      return result;
    }

    console.log(`[IndiaMART Parser] No phone/email found in email`);
    return null;
  }

  /**
   * Parse JustDial email
   */
  static parseJustDial(content: string): ParsedLead | null {
    const result: ParsedLead = { name: '', phone: '', email: '', product: '', requirement: '', city: '', source: 'justdial' };

    // JustDial format: "Customer Name: XXX" or "Enquiry from XXX"
    const nameMatch = content.match(/(?:Customer\s+Name|Enquiry\s+from|Contact\s+Person|Name)[:\s]*([A-Za-z\s]+?)(?:\n|$)/i);
    if (nameMatch) result.name = nameMatch[1].trim();

    // Phone
    const phones = content.match(/(?:\+?91[\s.-]?)?([6-9]\d{9})/g);
    if (phones) {
      for (const p of phones) {
        const clean = p.replace(/[\s.-]/g, '');
        if (clean.length >= 10) { result.phone = clean.slice(-10); break; }
      }
    }

    // Email
    const emails = content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
    if (emails) {
      const valid = emails.filter(e => !e.includes('justdial.com') && !e.includes('noreply'));
      if (valid.length > 0) result.email = valid[0];
    }

    // Product/Service
    const productMatch = content.match(/(?:Service\s+Required|Product|Category|Looking\s+for)[:\s]*(.+?)(?:\n|$)/i);
    if (productMatch) result.product = productMatch[1].trim().substring(0, 200);

    // Message
    const reqMatch = content.match(/(?:Message|Requirements|Details|Comments)[:\s]*(.+?)(?:\n\n|$)/is);
    if (reqMatch) result.requirement = reqMatch[1].trim().substring(0, 500);

    // City
    const cityMatch = content.match(/(?:City|Location|Area)[:\s]*([A-Za-z\s]+?)(?:\n|$)/i);
    if (cityMatch) result.city = cityMatch[1].trim().substring(0, 100);

    return (result.phone || result.email) ? result : null;
  }

  /**
   * Parse TradeIndia email
   */
  static parseTradeIndia(content: string): ParsedLead | null {
    const result: ParsedLead = { name: '', phone: '', email: '', product: '', requirement: '', city: '', source: 'tradeindia' };

    // TradeIndia format: "Buyer: XXX" or "Enquiry from XXX"
    const nameMatch = content.match(/(?:Buyer|Buyer\s+Name|Enquiry\s+from|Contact)[:\s]*([A-Za-z\s]+?)(?:\n|$)/i);
    if (nameMatch) result.name = nameMatch[1].trim();

    // Phone
    const phones = content.match(/(?:\+?91[\s.-]?)?([6-9]\d{9})/g);
    if (phones) {
      for (const p of phones) {
        const clean = p.replace(/[\s.-]/g, '');
        if (clean.length >= 10) { result.phone = clean.slice(-10); break; }
      }
    }

    // Email
    const emails = content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
    if (emails) {
      const valid = emails.filter(e => !e.includes('tradeindia.com') && !e.includes('noreply'));
      if (valid.length > 0) result.email = valid[0];
    }

    // Product
    const productMatch = content.match(/(?:Product\s+Required|Product|Item|Looking\s+for)[:\s]*(.+?)(?:\n|$)/i);
    if (productMatch) result.product = productMatch[1].trim().substring(0, 200);

    // Requirement
    const reqMatch = content.match(/(?:Requirement|Description|Details|Message)[:\s]*(.+?)(?:\n\n|$)/is);
    if (reqMatch) result.requirement = reqMatch[1].trim().substring(0, 500);

    // City
    const cityMatch = content.match(/(?:City|Location|From)[:\s]*([A-Za-z\s]+?)(?:\n|$)/i);
    if (cityMatch) result.city = cityMatch[1].trim().substring(0, 100);

    return (result.phone || result.email) ? result : null;
  }

  /**
   * Get email search domains for platform
   */
  static getSearchDomains(platform: Platform): string[] {
    const domains: Record<Platform, string[]> = {
      indiamart: ['indiamart.com', 'leadz@indiamart.com', 'noreply@indiamart.com', 'enquiry@indiamart.com', 'buyershelp+enq@indiamart.com', 'buyershelp@indiamart.com', 'buyershelpdesk@indiamart.com', 'buyleads@indiamart.com'],
      justdial: ['justdial.com', 'noreply@justdial.com', 'leads@justdial.com', 'enquiry@justdial.com'],
      tradeindia: ['tradeindia.com', 'noreply@tradeindia.com', 'leads@tradeindia.com', 'enquiry@tradeindia.com'],
    };
    return domains[platform];
  }

  /**
   * Get platform display name
   */
  static getPlatformName(platform: Platform): string {
    const names: Record<Platform, string> = {
      indiamart: 'IndiaMART',
      justdial: 'JustDial',
      tradeindia: 'TradeIndia',
    };
    return names[platform];
  }

  /**
   * URL-decode email content - IndiaMART sometimes sends URL-encoded content
   * where %20 = space, %7B%7B = {{, %0A = newline, etc.
   */
  static decodeContent(content: string): string {
    try {
      // Only decode if contains percent-encoded characters
      if (content.includes('%')) {
        const decoded = decodeURIComponent(content);
        return decoded;
      }
    } catch {
      // If decode fails, try manually replacing common patterns
      try {
        return content
          .replace(/%20/g, ' ')
          .replace(/%7B%7B/g, '{{')
          .replace(/%7D%7D/g, '}}')
          .replace(/%0A/g, '\n')
          .replace(/%0D/g, '\r')
          .replace(/%2C/g, ',')
          .replace(/%3A/g, ':')
          .replace(/%2F/g, '/')
          .replace(/%40/g, '@')
          .replace(/%2E/g, '.')
          .replace(/%2D/g, '-')
          .replace(/%5F/g, '_')
          .replace(/%2B/g, '+')
          .replace(/%23/g, '#')
          .replace(/%3F/g, '?')
          .replace(/%3D/g, '=')
          .replace(/%26/g, '&');
      } catch {
        return content;
      }
    }
    return content;
  }

  /**
   * Convert HTML to plain text
   */
  static htmlToText(html: string): string {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }

  /**
   * Process emails and capture leads
   */
  static async processEmails(
    businessId: string,
    emailConfig: {
      imapHost: string;
      imapPort: number;
      email: string;
      password: string;
      useSSL: boolean;
    },
    platform: Platform,
    options: {
      since?: Date;
      saveToSheet?: boolean;
      spreadsheetId?: string;
    } = {}
  ): Promise<{
    processed: number;
    newLeads: number;
    skipped: number;
    errors: string[];
    leads: any[];
  }> {
    const result = {
      processed: 0,
      newLeads: 0,
      skipped: 0,
      errors: [] as string[],
      leads: [] as any[],
    };

    try {
      const Imap = (await import('imap')).default as any;
      const imap = new Imap({
        user: emailConfig.email,
        password: emailConfig.password,
        host: emailConfig.imapHost,
        port: emailConfig.imapPort,
        tls: emailConfig.useSSL,
        tlsOptions: { rejectUnauthorized: false },
        connTimeout: 30000,
        authTimeout: 15000,
      });

      const since = options.since || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const platformName = this.getPlatformName(platform);
      const searchDomains = this.getSearchDomains(platform);

      console.log(`[${platformName}] Connecting to IMAP: ${emailConfig.imapHost}:${emailConfig.imapPort}`);

      await new Promise<void>((resolve, reject) => {
        imap.once('ready', () => {
          console.log(`[${platformName}] IMAP connected successfully`);
          imap.openBox('INBOX', true, async (err) => {
            if (err) {
              imap.end();
              reject(new Error(`Failed to open INBOX: ${err.message}`));
              return;
            }

            console.log(`[${platformName}] Searching emails since ${since.toISOString()}`);

            // Build OR query dynamically for ALL search domains (handles any number of domains)
            const searchQuery: any[] = [['SINCE', since]];
            if (searchDomains.length === 1) {
              searchQuery.push(['FROM', searchDomains[0]]);
            } else {
              let orQuery: any = ['FROM', searchDomains[0]];
              for (let i = 1; i < searchDomains.length; i++) {
                orQuery = ['OR', orQuery, ['FROM', searchDomains[i]]];
              }
              searchQuery.push(orQuery);
            }

            imap.search(searchQuery, async (err, results) => {
              if (err) {
                console.error(`[${platformName}] Search error:`, err);
                imap.end();
                resolve();
                return;
              }

              if (!results || results.length === 0) {
                console.log(`[${platformName}] No emails found for ${platformName}`);
                imap.end();
                resolve();
                return;
              }

              console.log(`[${platformName}] Found ${results.length} emails from ${platformName} domains`);

              // FIX 2: Process ALL emails, not just last 100! (was `results.slice(-limit)` which missed Indiamart emails)
              const toFetch = results; // Process ALL matching emails
              const fetch = imap.fetch(toFetch, { bodies: '', struct: true });

              let emailCount = 0;
              let matchCount = 0;
              const processPromises: Promise<void>[] = [];

              fetch.on('message', (msg) => {
                msg.on('body', (stream) => {
                  const p = (async () => {
                    try {
                      const parsed = await simpleParser(stream);
                      const fromAddress = (parsed.from?.text || '').toLowerCase();
                      const subject = ((parsed as any).subject || '').toLowerCase();
                      const emailText = (parsed as any).text || '';
                      const emailHtml = (parsed as any).html || '';
                      emailCount++;

                      // Check if this email is from the platform
                      const found = fromAddress.includes(platform);
                      if (!found) {
                        console.log(`[${platformName}] Skipping non-platform email: ${fromAddress}`);
                        return;
                      }

                      matchCount++;
                      console.log(`[${platformName}] #${matchCount}: From: ${fromAddress}, Sub: ${(parsed as any).subject}`);

                      // CRITICAL: URL-decode email text (IndiaMART sends URL-encoded content)
                      const decodedText = this.decodeContent(emailText);
                      const decodedHtml = emailHtml ? this.htmlToText(this.decodeContent(emailHtml)) : '';

                      // Try parsing via platform parser first (try decoded text, then HTML)
                      let leadData = this.parseEmail('', decodedText, platform);
                      
                      // If parsing fails, try HTML version (has rendered buyer data)
                      if (!leadData && decodedHtml) {
                        console.log(`[${platformName}] Text parsing failed, trying HTML...`);
                        leadData = this.parseEmail('', decodedHtml, platform);
                      }
                      
                      // Last resort: try original raw HTML->text conversion
                      if (!leadData && emailHtml) {
                        const rawHtmlText = this.htmlToText(emailHtml);
                        leadData = this.parseEmail('', rawHtmlText, platform);
                      }

                      let phone = leadData?.phone || '';
                      let email = leadData?.email || '';

                      // FIX 3: Fallback phone extraction (was missing - if parser failed, no lead created)
                      // Use DECODED text for fallback extraction
                      if (!phone) {
                        const phoneMatch = decodedText.match(/(?:\+?91[\s.-]?)?([6-9]\d{9})/);
                        if (phoneMatch) {
                          phone = phoneMatch[1].slice(-10);
                          console.log(`[${platformName}] Fallback phone extraction: ${phone}`);
                        }
                      }
                      if (!phone && decodedHtml) {
                        const phoneMatch = decodedHtml.match(/(?:\+?91[\s.-]?)?([6-9]\d{9})/);
                        if (phoneMatch) {
                          phone = phoneMatch[1].slice(-10);
                          console.log(`[${platformName}] HTML fallback phone extraction: ${phone}`);
                        }
                      }
                      if (!phone) {
                        const phoneMatch = decodedText.match(/[6-9]\d{9}/);
                        if (phoneMatch) {
                          phone = phoneMatch[0];
                          console.log(`[${platformName}] Loose phone extraction: ${phone}`);
                        }
                      }
                      // Fallback email extraction (on decoded content)
                      if (!email) {
                        const emailMatch = decodedText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
                        if (emailMatch && !emailMatch[1].includes('indiamart.com') && !emailMatch[1].includes('buyershelp')) {
                          email = emailMatch[1];
                          console.log(`[${platformName}] Fallback email extraction: ${email}`);
                        }
                      }
                      // Fallback email from HTML
                      if (!email && decodedHtml) {
                        const emailMatch = decodedHtml.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
                        if (emailMatch && !emailMatch[1].includes('indiamart.com') && !emailMatch[1].includes('buyershelp')) {
                          email = emailMatch[1];
                          console.log(`[${platformName}] HTML fallback email extraction: ${email}`);
                        }
                      }

                      if (phone || email) {
                        result.processed++;

                        // Check duplicate
                        const existing = phone
                          ? await prisma.contact.findFirst({
                              where: { 
                                businessId, 
                                phone,
                                source: platform,
                              },
                            })
                          : null;

                        if (existing) {
                          result.skipped++;
                          console.log(`[${platformName}] Duplicate: ${phone}`);
                          return;
                        }

                        // Use name from parser or fallback display name
                        const name = leadData?.name || emailText.match(/Buyer\s+Name[^\n]+/i)?.[0]?.replace(/Buyer\s+Name[\s:]*/i, '').trim() || `${platformName} Customer`;

                        // Capture lead
                        let contact;
                        if (platform === 'indiamart') {
                          contact = await LeadCaptureService.captureIndiaMARTLead(businessId, {
                            name,
                            phone,
                            email: email || undefined,
                            product: leadData?.product || '',
                            requirement: leadData?.requirement || '',
                            city: leadData?.city || '',
                          });
                        } else if (platform === 'justdial') {
                          contact = await LeadCaptureService.captureJustDialLead(businessId, {
                            name,
                            phone,
                            email: email || undefined,
                            service: leadData?.product || '',
                            location: leadData?.city || '',
                            message: leadData?.requirement || '',
                          });
                        } else {
                          contact = await LeadCaptureService.captureIndiaMARTLead(businessId, {
                            name,
                            phone,
                            email: email || undefined,
                            product: leadData?.product || '',
                            requirement: leadData?.requirement || '',
                            city: leadData?.city || '',
                          });
                          if (contact) {
                            await prisma.contact.update({
                              where: { id: contact.id },
                              data: { source: 'tradeindia', tags: ['TradeIndia', 'Lead'] },
                            });
                          }
                        }

                        result.newLeads++;
                        result.leads.push(contact);
                        console.log(`[${platformName}] New lead: ${name} ${phone}`);
                      } else {
                        console.log(`[${platformName}] No phone/email in email from: ${fromAddress}`);
                        console.log(`[${platformName}] RAW TEXT (first 300 chars):`, (emailText || '').substring(0, 300));
                        console.log(`[${platformName}] DECODED TEXT (first 300 chars):`, (decodedText || '').substring(0, 300));
                      }
                    } catch (e: any) {
                      result.errors.push(`Parse error: ${e.message}`);
                      console.error(`[${platformName}] Parse error:`, e.message);
                    }
                  })();
                  processPromises.push(p);
                });
              });

              fetch.once('end', () => {
                // FIX 4: Wait for ALL async operations to complete before resolving
                Promise.all(processPromises).then(() => {
                  console.log(`[${platformName}] Done. Processed: ${result.processed}, New: ${result.newLeads}`);
                  imap.end();
                  resolve();
                }).catch((err) => {
                  console.error(`[${platformName}] Async error:`, err);
                  imap.end();
                  resolve();
                });
              });

              fetch.once('error', (err) => {
                result.errors.push(`Fetch error: ${err.message}`);
                imap.end();
                resolve();
              });
            });
          });
        });

        imap.once('error', (err) => {
          reject(new Error(`IMAP error: ${err.message}`));
        });

        imap.connect();
      });
    } catch (e: any) {
      result.errors.push(`Process error: ${e.message}`);
      console.error(`[${platform}] Error:`, e);
    }

    return result;
  }

  /**
   * Test IMAP connection
   */
  static async testConnection(
    emailConfig: {
      imapHost: string;
      imapPort: number;
      email: string;
      password: string;
      useSSL: boolean;
    },
    platform: Platform
  ): Promise<{
    connected: boolean;
    mailbox?: string;
    totalEmails?: number;
    platformEmails?: number;
  }> {
    const Imap = (await import('imap')).default as any;
    const imap = new Imap({
      user: emailConfig.email,
      password: emailConfig.password,
      host: emailConfig.imapHost,
      port: emailConfig.imapPort,
      tls: emailConfig.useSSL,
      tlsOptions: { rejectUnauthorized: false },
      connTimeout: 15000,
      authTimeout: 10000,
    });

    return new Promise((resolve, reject) => {
      imap.once('ready', () => {
        imap.openBox('INBOX', true, (err, box) => {
          if (err) {
            imap.end();
            reject(new Error(`Failed to open INBOX: ${err.message}`));
            return;
          }

          const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          const searchDomains = this.getSearchDomains(platform);
          const searchQuery: any[] = [['SINCE', since]];
          if (searchDomains.length === 1) {
            searchQuery.push(['FROM', searchDomains[0]]);
          } else {
            let orQuery: any = ['FROM', searchDomains[0]];
            for (let i = 1; i < searchDomains.length; i++) {
              orQuery = ['OR', orQuery, ['FROM', searchDomains[i]]];
            }
            searchQuery.push(orQuery);
          }

          imap.search(searchQuery, (err, results) => {
            imap.end();
            resolve({
              connected: true,
              mailbox: box.name,
              totalEmails: box.messages.total,
              platformEmails: results ? results.length : 0,
            });
          });
        });
      });

      imap.once('error', (err) => {
        reject(new Error(`IMAP connection failed: ${err.message}`));
      });

      imap.connect();
    });
  }
}
