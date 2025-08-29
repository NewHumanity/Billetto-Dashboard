

import { BillettoEvent, ListResponse, Attendee, Order, LedgerEntry, Campaign, TicketGroup, TargetGroup, TargetGroupMember } from '../types';
import { limitRequest } from './requestLimiter';

// Switching to a more reliable proxy to handle fetch errors.
const CORS_PROXY_URL = 'https://yogamela.org/billetto-proxy.php';
const BILLETTO_API_BASE = 'https://billetto.dk/api/v3/organiser';
const REQUEST_TIMEOUT = 15000; // 15 seconds

export enum BillettoErrorType {
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  NOT_FOUND = 'NOT_FOUND_ERROR',
  NETWORK = 'NETWORK_ERROR',
  RATE_LIMIT = 'RATE_LIMIT_ERROR',
  VALIDATION = 'VALIDATION_ERROR',
  UNKNOWN = 'UNKNOWN_ERROR'
}

export class BillettoApiError extends Error {
  constructor(
    message: string,
    public type: BillettoErrorType,
    public status?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'BillettoApiError';
  }
}

export class BillettoApiClient {
  private readonly apiKey: string;
  private readonly useProxy: boolean;
  private readonly billettoApiBase: string;

  constructor(apiKey: string, useProxy = true, customBaseUrl?: string) {
    if (!apiKey) {
      throw new BillettoApiError('Billetto API key is required', BillettoErrorType.VALIDATION);
    }
    this.apiKey = apiKey;
    this.useProxy = useProxy;
    this.billettoApiBase = customBaseUrl || BILLETTO_API_BASE;
  }

  private getHeaders(): Record<string, string> {
    return {
      'Accept': 'application/json',
      'Api-Keypair': this.apiKey,
      'User-Agent': 'BillettoStatisticsViewer/1.0'
    };
  }
  
  private async makeRequest(endpoint: string, timeout: number): Promise<Response> {
    const doFetch = async (): Promise<Response> => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const isFullUrl = endpoint.startsWith('http');
        const targetUrl = isFullUrl ? endpoint : `${this.billettoApiBase}${endpoint}`;
        
        const requestUrl = this.useProxy ? `${CORS_PROXY_URL}?url=${encodeURIComponent(targetUrl)}` : targetUrl;

        try {
            const response = await fetch(requestUrl, {
                method: 'GET',
                headers: this.getHeaders(),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);
            
            if (!response.ok) {
                await this.handleHttpError(response);
            }

            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error instanceof Error && error.name === 'AbortError') {
                throw new BillettoApiError(`Request timeout after ${timeout}ms`, BillettoErrorType.NETWORK);
            }
            
            console.error(
                "Billetto API Request Failed:",
                `\nRequest URL: ${requestUrl}`,
                `\nTarget URL: ${targetUrl}`,
                "\nError:", error,
                this.useProxy 
                ? `\n\nThis is often due to a CORS issue when running in a browser. The app uses the proxy '${CORS_PROXY_URL}' to bypass this, but the proxy might be down, the Billetto API might be blocking it, or the target URL might be incorrect.`
                : "\n\nThis could be a CORS issue if running in a browser without a proxy, or a network error.",
                "Check your network connection and the browser's developer console for more details on the failed request."
            );
            
            const userMessage = "Network error. This could be due to a CORS problem, your internet connection, or the Billetto API being temporarily down. Please check the developer console for more details.";
            throw new BillettoApiError(userMessage, BillettoErrorType.NETWORK, undefined, error);
        }
    };
    
    // Wrap the actual fetch logic with our global rate limiter
    return limitRequest(doFetch);
  }
  
  private async handleHttpError(response: Response): Promise<never> {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    let errorDetails: unknown;

    try {
      const errorData = await response.json();
      errorMessage = errorData?.error?.message || errorData.message || errorData.error || errorMessage;
      errorDetails = errorData;
    } catch {
      // ignore json parse error
    }

    switch (response.status) {
      case 401:
        throw new BillettoApiError('Authentication failed. Please check your Billetto API Keypair.', BillettoErrorType.AUTHENTICATION, response.status, errorDetails);
      case 404:
        throw new BillettoApiError('Resource not found. Please check the endpoint.', BillettoErrorType.NOT_FOUND, response.status, errorDetails);
      case 429:
        throw new BillettoApiError('Rate limit exceeded. Please wait before making another request.', BillettoErrorType.RATE_LIMIT, response.status, errorDetails);
      default:
        throw new BillettoApiError(errorMessage, BillettoErrorType.UNKNOWN, response.status, errorDetails);
    }
  }

  private async parseListResponse<T>(response: Response): Promise<ListResponse<T>> {
    const data = await response.json();
    if (data && data.object === 'list' && Array.isArray(data.data)) {
      return data as ListResponse<T>;
    }
    throw new BillettoApiError('Invalid list response structure from API', BillettoErrorType.VALIDATION, response.status, data);
  }

  private isValidEvent(event: any): event is BillettoEvent {
    return event && event.object === 'event' && typeof event.id === 'string';
  }

  public async fetchListEndpoint<T>(endpoint: string): Promise<ListResponse<T>> {
    const response = await this.makeRequest(endpoint, REQUEST_TIMEOUT);
    return this.parseListResponse<T>(response);
  }

  async getEvents(page = 1, limit = 100): Promise<ListResponse<BillettoEvent>> {
    const endpoint = `/events?page=${page}&limit=${limit}&sort=-starts_at`;
    const response = await this.makeRequest(endpoint, REQUEST_TIMEOUT);
    return this.parseListResponse<BillettoEvent>(response);
  }

  async getEvent(eventId: string, expand: string[] = []): Promise<BillettoEvent> {
    const expandQuery = expand.length > 0 ? `?expand=${expand.join(',')}` : '';
    const endpoint = `/events/${eventId}${expandQuery}`;
    const response = await this.makeRequest(endpoint, REQUEST_TIMEOUT);
    const eventData = await response.json();
    if (this.isValidEvent(eventData)) {
      return eventData;
    }
    throw new BillettoApiError('Invalid event data structure for single event', BillettoErrorType.VALIDATION, undefined, eventData);
  }
  
  async getAttendees(page = 1, limit = 100, expand: string[] = []): Promise<ListResponse<Attendee>> {
    const expandQuery = expand.length > 0 ? `&expand=${expand.join(',')}` : '';
    const endpoint = `/attendees?page=${page}&limit=${limit}${expandQuery}&sort=-created_at`;
    const response = await this.makeRequest(endpoint, REQUEST_TIMEOUT);
    return this.parseListResponse<Attendee>(response);
  }

  async getAttendee(attendeeId: string, expand: string[] = []): Promise<Attendee> {
    const expandQuery = expand.length > 0 ? `?expand=${expand.join(',')}` : '';
    const endpoint = `/attendees/${attendeeId}${expandQuery}`;
    const response = await this.makeRequest(endpoint, REQUEST_TIMEOUT);
    const attendeeData = await response.json();
    if (attendeeData && attendeeData.object === 'attendee' && typeof attendeeData.id === 'string') {
        return attendeeData as Attendee;
    }
    throw new BillettoApiError('Invalid attendee data structure', BillettoErrorType.VALIDATION, undefined, attendeeData);
  }

  async getEventAttendees(eventId: string, page = 1, limit = 100, expand: string[] = []): Promise<ListResponse<Attendee>> {
    const expandQuery = expand.length > 0 ? `&expand=${expand.join(',')}` : '';
    const endpoint = `/events/${eventId}/attendees?page=${page}&limit=${limit}${expandQuery}`;
    const response = await this.makeRequest(endpoint, REQUEST_TIMEOUT);
    return this.parseListResponse<Attendee>(response);
  }
  
  async getEventTicketGroups(eventId: string, page = 1, limit = 100): Promise<ListResponse<TicketGroup>> {
    const endpoint = `/ticket_types?event=${eventId}&page=${page}&limit=${limit}`;
    const response = await this.makeRequest(endpoint, REQUEST_TIMEOUT);
    return this.parseListResponse<TicketGroup>(response);
  }

  async getOrders(page = 1, limit = 100, expand: string[] = [], filters: Record<string, string> = {}): Promise<ListResponse<Order>> {
    const expandQuery = expand.length > 0 ? `&expand=${expand.join(',')}` : '';
    
    const filterParams = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
        if (value) { // Ensure value is not null, undefined, or empty string
            filterParams.append(key, value);
        }
    }
    const filterQuery = filterParams.toString();

    const endpoint = `/orders?page=${page}&limit=${limit}${expandQuery}&sort=-created_at${filterQuery ? '&' + filterQuery : ''}`;
    const response = await this.makeRequest(endpoint, REQUEST_TIMEOUT);
    return this.parseListResponse<Order>(response);
  }

  async getOrder(orderId: string, expand: string[] = []): Promise<Order> {
    const expandQuery = expand.length > 0 ? `&expand=${expand.join(',')}` : '';
    const endpoint = `/orders/${orderId}?${expandQuery}`;
    const response = await this.makeRequest(endpoint, REQUEST_TIMEOUT);
    const orderData = await response.json();
    if (orderData && orderData.object === 'order' && typeof orderData.id === 'string') {
        return orderData as Order;
    }
    throw new BillettoApiError('Invalid order data structure for single order', BillettoErrorType.VALIDATION, undefined, orderData);
  }
  
  async getLedgerEntries(page = 1, limit = 100, expand: string[] = []): Promise<ListResponse<LedgerEntry>> {
    const expandQuery = expand.length > 0 ? `&expand=${expand.join(',')}` : '';
    const endpoint = `/ledger_entries?page=${page}&limit=${limit}${expandQuery}&sort=-created_at`;
    const response = await this.makeRequest(endpoint, REQUEST_TIMEOUT);
    return this.parseListResponse<LedgerEntry>(response);
  }
  
  async getCampaigns(page = 1, limit = 100, expand: string[] = []): Promise<ListResponse<Campaign>> {
    const expandQuery = expand.length > 0 ? `&expand=${expand.join(',')}` : '';
    const endpoint = `/campaigns?page=${page}&limit=${limit}${expandQuery}&sort=-created_at`;
    const response = await this.makeRequest(endpoint, REQUEST_TIMEOUT);
    return this.parseListResponse<Campaign>(response);
  }

  async getCampaign(campaignId: string, expand: string[] = []): Promise<Campaign> {
    const expandQuery = expand.length > 0 ? `?expand=${expand.join(',')}` : '';
    const endpoint = `/campaigns/${campaignId}${expandQuery}`;
    const response = await this.makeRequest(endpoint, REQUEST_TIMEOUT);
    const campaignData = await response.json();
    if (campaignData && campaignData.object === 'campaign' && typeof campaignData.id === 'string') {
        return campaignData as Campaign;
    }
    throw new BillettoApiError('Invalid campaign data structure', BillettoErrorType.VALIDATION, undefined, campaignData);
  }

  async getCampaignOrders(campaignId: string, page = 1, limit = 100, expand: string[] = []): Promise<ListResponse<Order>> {
    const expandQuery = expand.length > 0 ? `&expand=${expand.join(',')}` : '';
    const endpoint = `/campaigns/${campaignId}/orders?page=${page}&limit=${limit}${expandQuery}&sort=-created_at`;
    const response = await this.makeRequest(endpoint, REQUEST_TIMEOUT);
    return this.parseListResponse<Order>(response);
  }

  async getTargetGroups(page = 1, limit = 100): Promise<ListResponse<TargetGroup>> {
    const endpoint = `/target_groups?page=${page}&limit=${limit}&sort=-created_at`;
    const response = await this.makeRequest(endpoint, REQUEST_TIMEOUT);
    return this.parseListResponse<TargetGroup>(response);
  }

  async getTargetGroupMembers(groupId: string, page = 1, limit = 100): Promise<ListResponse<TargetGroupMember>> {
    const endpoint = `/target_groups/${groupId}/members?page=${page}&limit=${limit}`;
    const response = await this.makeRequest(endpoint, REQUEST_TIMEOUT);
    return this.parseListResponse<TargetGroupMember>(response);
  }
  
  async getEventOrders(eventId: string, page = 1, limit = 100, expand: string[] = []): Promise<ListResponse<Order>> {
    const expandQuery = expand.length > 0 ? `&expand=${expand.join(',')}` : '';
    const endpoint = `/orders?event=${eventId}&page=${page}&limit=${limit}&sort=created_at${expandQuery}`;
    const response = await this.makeRequest(endpoint, REQUEST_TIMEOUT);
    return this.parseListResponse<Order>(response);
  }

  async getEventLedgerEntries(eventId: string, page = 1, limit = 100): Promise<ListResponse<LedgerEntry>> {
    const endpoint = `/ledger_entries?event=${eventId}&page=${page}&limit=${limit}&sort=-created_at`;
    const response = await this.makeRequest(endpoint, REQUEST_TIMEOUT);
    return this.parseListResponse<LedgerEntry>(response);
  }
}

export default BillettoApiClient;