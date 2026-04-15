import { supabase } from './supabase';
import { v4 as uuidv4 } from 'uuid';

const VISITOR_ID_KEY = 'portfolio_visitor_id';
const SESSION_ID_KEY = 'portfolio_session_id';
const SESSION_EXPIRY = 30 * 60 * 1000; // 30 minutes

interface TrackingEvent {
  event_type: 'page_view' | 'click' | 'lead_start' | 'lead_complete';
  page_path: string;
  metadata?: Record<string, any>;
}

class TrackingService {
  private visitorId: string;
  private sessionId: string;
  private anonymizeIp: boolean = false;

  constructor() {
    this.visitorId = this.getOrCreateVisitorId();
    this.sessionId = this.getOrCreateSessionId();
  }

  setAnonymizeIp(value: boolean) {
    this.anonymizeIp = value;
  }

  private getOrCreateVisitorId(): string {
    let id = localStorage.getItem(VISITOR_ID_KEY);
    if (!id) {
      id = uuidv4();
      localStorage.setItem(VISITOR_ID_KEY, id);
    }
    return id;
  }

  private getOrCreateSessionId(): string {
    const now = Date.now();
    const sessionData = localStorage.getItem(SESSION_ID_KEY);
    
    if (sessionData) {
      const { id, lastActivity } = JSON.parse(sessionData);
      if (now - lastActivity < SESSION_EXPIRY) {
        this.updateSessionActivity(id);
        return id;
      }
    }

    const newId = uuidv4();
    this.updateSessionActivity(newId);
    return newId;
  }

  private updateSessionActivity(id: string) {
    localStorage.setItem(SESSION_ID_KEY, JSON.stringify({
      id,
      lastActivity: Date.now()
    }));
  }

  private getDeviceInfo() {
    const ua = navigator.userAgent;
    let browser = 'Unknown';
    let os = 'Unknown';
    let deviceType = 'desktop';

    if (/mobile/i.test(ua)) deviceType = 'mobile';
    else if (/tablet/i.test(ua)) deviceType = 'tablet';

    if (/chrome|crios/i.test(ua)) browser = 'Chrome';
    else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
    else if (/safari/i.test(ua)) browser = 'Safari';
    else if (/edg/i.test(ua)) browser = 'Edge';

    if (/windows/i.test(ua)) os = 'Windows';
    else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
    else if (/android/i.test(ua)) os = 'Android';
    else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
    else if (/linux/i.test(ua)) os = 'Linux';

    return { browser, os, device_type: deviceType, user_agent: ua };
  }

  async trackEvent({ event_type, page_path, metadata = {} }: TrackingEvent) {
    const deviceInfo = this.getDeviceInfo();
    
    try {
      const { error } = await supabase.from('tracking_events').insert({
        visitor_id: this.anonymizeIp ? 'anonymous' : this.visitorId,
        session_id: this.anonymizeIp ? 'anonymous' : this.sessionId,
        event_type,
        page_path,
        referrer: this.anonymizeIp ? null : (document.referrer || null),
        ...(this.anonymizeIp ? {
          browser: deviceInfo.browser,
          os: deviceInfo.os,
          device_type: deviceInfo.device_type,
          user_agent: 'Anonymized'
        } : deviceInfo),
        metadata
      });

      if (error) console.error('Tracking error:', error);
    } catch (err) {
      console.error('Failed to track event:', err);
    }
  }

  trackPageView() {
    this.trackEvent({
      event_type: 'page_view',
      page_path: window.location.pathname
    });
  }
}

export const tracking = new TrackingService();
