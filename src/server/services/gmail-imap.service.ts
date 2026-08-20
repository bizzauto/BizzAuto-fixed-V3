import { prisma } from '../db.js';
import { LeadCaptureService } from './lead-capture.service.js';
import { EmailLeadService } from './email-lead.service.js';
import { simpleParser } from 'mailparser';

/**
 * Gmail IMAP Service - Simple and Reliable
 * Directly connects to Gmail IMAP
 */
export class GmailIMAPService {
  static async fetchAndCreateLeads(
    businessId: string,
    config: {
      email: string;
      password: string;
    },
    options: {
      days?: number;
      platform?: string;
    } = {}
  ): Promise<{
    success: boolean;
    totalEmails: number;
    indiamartEmails: number;
    leadsCreated: number;
    errors: string[];
    details: string[];
  }> {
    const result = {
      success: false,
      totalEmails: 0,
      indiamartEmails: 0,
      leadsCreated: 0,
      errors: [] as string[],
      details: [] as string[],
    };

    try {
      const Imap = (await import('imap')).default;
      const cleanPassword = config.password.replace(/\s/g, '');
      
      result.details.push(`Connecting to imap.gmail.com:993`);
      result.details.push(`Email: ${config.email}`);
      result.details.push(`Password length: ${cleanPassword.length}`);

      const imap = new Imap({
        user: config.email,
        password: cleanPassword,
        host: 'imap.gmail.com',
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
        connTimeout: 30000,
        authTimeout: 20000,
      });

      return new Promise((resolve) => {
        let resolved = false;
        
        const safeResolve = (value: typeof result) => {
          if (!resolved) {
            resolved = true;
            try { imap.end(); } catch {}
            resolve(value);
          }
        };

        imap.once('ready', () => {
          result.details.push('IMAP connected!');
          
          imap.openBox('INBOX', true, (err, box) => {
            if (err) {
              result.errors.push(`Cannot open INBOX: ${err.message}`);
              safeResolve(result);
              return;
            }

            result.details.push(`INBOX opened. Total: ${box.messages.total}`);
            result.totalEmails = box.messages.total;

            const days = options.days || 30;
            const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
            result.details.push(`Searching since ${since.toDateString()}`);

            imap.search([['SINCE', since]], (err, results) => {
              if (err) {
                result.errors.push(`Search error: ${err.message}`);
                safeResolve(result);
                return;
              }

              if (!results || results.length === 0) {
                result.details.push('No emails found');
                safeResolve(result);
                return;
              }

              result.details.push(`Found ${results.length} emails`);
              
              // Process emails ONE BY ONE
              let processedCount = 0;
              const totalToProcess = results.length;

              const processNext = (index: number) => {
                if (index >= totalToProcess) {
                  result.details.push(`Done! Created ${result.leadsCreated} leads`);
                  result.success = true;
                  safeResolve(result);
                  return;
                }

                const seqno = results[index];
                const fetch = imap.fetch([seqno], { bodies: '' });

                fetch.on('message', (msg) => {
                  msg.on('body', (stream) => {
                    const chunks: Buffer[] = [];
                    
                    stream.on('data', (chunk: Buffer) => {
                      chunks.push(chunk);
                    });

                    stream.on('end', async () => {
                      try {
                        const fullContent = Buffer.concat(chunks).toString();
                        const parsed = await simpleParser(fullContent);
                        
                        const from = (parsed.from?.text || '').toLowerCase();
                        const subject = (parsed.subject || '').toLowerCase();
                        const text = (parsed.text || '').toLowerCase();
                        
                        processedCount++;
                        result.details.push(`[${processedCount}/${totalToProcess}] From: ${from.substring(0, 50)}`);
                        
                        // Determine platform from email content
                        let detectedPlatform = options.platform || 'indiamart';
                        if (from.includes('justdial') || subject.includes('justdial') || text.includes('justdial')) {
                          detectedPlatform = 'justdial';
                        } else if (from.includes('tradeindia') || subject.includes('tradeindia') || text.includes('tradeindia')) {
                          detectedPlatform = 'tradeindia';
                        }

                        // Check if it's a lead-related email
                        const isLeadEmail = 
                          from.includes(detectedPlatform) || 
                          subject.includes(detectedPlatform) ||
                          subject.includes('enquiry') ||
                          subject.includes('buyer') ||
                          subject.includes('query') ||
                          subject.includes('lead') ||
                          text.includes(detectedPlatform);

                        if (isLeadEmail) {
                          
                          // Parse lead using detected platform
                          const leadData = EmailLeadService.parseEmail(
                            parsed.html || '',
                            parsed.text || '',
                            detectedPlatform as any
                          );

                          let phone = leadData?.phone || '';
                          let email = leadData?.email || '';
                          
                          // Fallback: extract phone directly
                          if (!phone) {
                            const phoneMatch = (parsed.text || '').match(/(?:\+?91[\s.-]?)?([6-9]\d{9})/);
                            if (phoneMatch) phone = phoneMatch[1].slice(-10);
                          }

                          if (phone || email) {
                            result.indiamartEmails++;
                            
                            // Check duplicate using detected platform
                            const existing = phone ? await prisma.contact.findFirst({
                              where: { businessId, phone, source: detectedPlatform },
                            }) : null;

                            if (!existing) {
                              // Use platform-specific capture function
                              let captureFn: Function;
                              if (detectedPlatform === 'justdial') {
                                captureFn = LeadCaptureService.captureJustDialLead;
                              } else {
                                captureFn = LeadCaptureService.captureIndiaMARTLead;
                              }
                              
                              const payload = {
                                name: (leadData?.name) || `${detectedPlatform.charAt(0).toUpperCase() + detectedPlatform.slice(1)} Customer`,
                                phone,
                                email: email || undefined,
                                product: (leadData?.product) || '',
                                city: (leadData?.city) || '',
                              };
                              
                              const contact = await captureFn(businessId, payload);
                              
                              // For tradeindia, fix source and tags since we reuse captureIndiaMARTLead
                              if (detectedPlatform === 'tradeindia' && contact) {
                                await prisma.contact.update({
                                  where: { id: contact.id },
                                  data: { source: 'tradeindia', tags: ['TradeIndia', 'Lead'] },
                                });
                              }
                              
                              result.leadsCreated++;
                              result.details.push(`Created: ${leadData?.name || 'Customer'} ${phone}`);
                            } else {
                              result.details.push(`Duplicate: ${phone}`);
                            }
                          }
                        }
                      } catch (e: any) {
                        result.errors.push(`Parse error: ${e.message}`);
                      }
                      
                      // Process next email
                      processNext(index + 1);
                    });
                  });
                });

                fetch.once('error', (err) => {
                  result.errors.push(`Fetch error: ${err.message}`);
                  processNext(index + 1);
                });
              };

              // Start processing first email
              processNext(0);
            });
          });
        });

        imap.once('error', (err) => {
          result.errors.push(`IMAP error: ${err.message}`);
          safeResolve(result);
        });

        setTimeout(() => {
          result.errors.push('Timeout after 60 seconds');
          safeResolve(result);
        }, 60000);

        imap.connect();
      });
    } catch (e: any) {
      result.errors.push(`Fatal error: ${e.message}`);
      return result;
    }
  }
}
