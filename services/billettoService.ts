

import { BillettoEvent, ListResponse, Attendee, Order, LedgerEntry, Campaign, TicketGroup, TargetGroup, TargetGroupMember } from '../types';

// Using corsproxy.io as it seems more robust for this API.
const CORS_PROXY_URL = 'https://corsproxy.io/?';
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
  private readonly billettoApiBase: string;

  constructor(apiKey: string, customBaseUrl?: string) {
    if (!apiKey) {
      throw new BillettoApiError('Billetto API key is required', BillettoErrorType.VALIDATION);
    }
    this.apiKey = apiKey;
    this.billettoApiBase = customBaseUrl || BILLETTO_API_BASE;
  }

  private getHeaders(): Record<string, string> {
    return {
      'Accept': 'application/json',
      'Api-Keypair': this.apiKey,
      'User-Agent': 'BillettoStatisticsViewer/1.0'
    };
  }
  
  private async makeRequest(proxyUrl: string, timeout: number, targetUrl: string): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(proxyUrl, {
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
        `\nProxy URL: ${proxyUrl}`,
        `\nTarget URL: ${targetUrl}`,
        "\nError:", error,
        "\n\nThis is often due to a CORS issue when running in a browser.",
        `The app uses the proxy '${CORS_PROXY_URL}' to bypass this, but the proxy might be down, the Billetto API might be blocking it, or the target URL might be incorrect.`,
        "Check your network connection and the browser's developer console for more details on the failed request."
      );
      
      const userMessage = "Network error. This could be due to a CORS problem, your internet connection, or the Billetto API being temporarily down. Please check the developer console for more details.";
      throw new BillettoApiError(userMessage, BillettoErrorType.NETWORK, undefined, error);
    }
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

  async getEvents(page = 1, perPage = 25): Promise<ListResponse<BillettoEvent>> {
    const targetUrl = `${this.billettoApiBase}/events?page=${page}&per_page=${perPage}&sort=-starts_at`;
    const proxyUrl = `${CORS_PROXY_URL}${targetUrl}`;
    const response = await this.makeRequest(proxyUrl, REQUEST_TIMEOUT, targetUrl);
    return this.parseListResponse<BillettoEvent>(response);
  }

  async getEvent(eventId: string): Promise<BillettoEvent> {
    const targetUrl = `${this.billettoApiBase}/events/${eventId}`;
    const proxyUrl = `${CORS_PROXY_URL}${targetUrl}`;
    const response = await this.makeRequest(proxyUrl, REQUEST_TIMEOUT, targetUrl);
    const eventData = await response.json();
    if (this.isValidEvent(eventData)) {
      return eventData;
    }
    throw new BillettoApiError('Invalid event data structure for single event', BillettoErrorType.VALIDATION, undefined, eventData);
  }
  
  async getAttendees(page = 1, perPage = 25, expand: string[] = []): Promise<ListResponse<Attendee>> {
    const expandQuery = expand.length > 0 ? `&expand=${expand.join(',')}` : '';
    const targetUrl = `${this.billettoApiBase}/attendees?page=${page}&per_page=${perPage}${expandQuery}&sort=-created_at`;
    const proxyUrl = `${CORS_PROXY_URL}${targetUrl}`;
    const response = await this.makeRequest(proxyUrl, REQUEST_TIMEOUT, targetUrl);
    return this.parseListResponse<Attendee>(response);
  }

  async getAttendee(attendeeId: string, expand: string[] = []): Promise<Attendee> {
    const expandQuery = expand.length > 0 ? `?expand=${expand.join(',')}` : '';
    const targetUrl = `${this.billettoApiBase}/attendees/${attendeeId}${expandQuery}`;
    const proxyUrl = `${CORS_PROXY_URL}${targetUrl}`;
    const response = await this.makeRequest(proxyUrl, REQUEST_TIMEOUT, targetUrl);
    const attendeeData = await response.json();
    if (attendeeData && attendeeData.object === 'attendee' && typeof attendeeData.id === 'string') {
        return attendeeData as Attendee;
    }
    throw new BillettoApiError('Invalid attendee data structure', BillettoErrorType.VALIDATION, undefined, attendeeData);
  }

  async getEventAttendees(eventId: string, page = 1, perPage = 100): Promise<ListResponse<Attendee>> {
    const targetUrl = `${this.billettoApiBase}/events/${eventId}/attendees?page=${page}&per_page=${perPage}`;
    const proxyUrl = `${CORS_PROXY_URL}${targetUrl}`;
    const response = await this.makeRequest(proxyUrl, REQUEST_TIMEOUT, targetUrl);
    return this.parseListResponse<Attendee>(response);
  }
  
  async getEventTicketGroups(eventId: string, page = 1, perPage = 100): Promise<ListResponse<TicketGroup>> {
    const targetUrl = `${this.billettoApiBase}/ticket_groups?event_id=${eventId}&page=${page}&per_page=${perPage}`;
    const proxyUrl = `${CORS_PROXY_URL}${targetUrl}`;
    const response = await this.makeRequest(proxyUrl, REQUEST_TIMEOUT, targetUrl);
    return this.parseListResponse<TicketGroup>(response);
  }

  async getOrders(page = 1, perPage = 25, expand: string[] = []): Promise<ListResponse<Order>> {
    const expandQuery = expand.length > 0 ? `&expand=${expand.join(',')}` : '';
    const targetUrl = `${this.billettoApiBase}/orders?page=${page}&per_page=${perPage}${expandQuery}&sort=-created_at`;
    const proxyUrl = `${CORS_PROXY_URL}${targetUrl}`;
    const response = await this.makeRequest(proxyUrl, REQUEST_TIMEOUT, targetUrl);
    return this.parseListResponse<Order>(response);
  }

  async getOrder(orderId: string, expand: string[] = []): Promise<Order> {
    const expandQuery = expand.length > 0 ? `&expand=${expand.join(',')}` : '';
    const targetUrl = `${this.billettoApiBase}/orders/${orderId}?${expandQuery}`;
    const proxyUrl = `${CORS_PROXY_URL}${targetUrl}`;
    const response = await this.makeRequest(proxyUrl, REQUEST_TIMEOUT, targetUrl);
    const orderData = await response.json();
    if (orderData && orderData.object === 'order' && typeof orderData.id === 'string') {
        return orderData as Order;
    }
    throw new BillettoApiError('Invalid order data structure for single order', BillettoErrorType.VALIDATION, undefined, orderData);
  }
  
  async getLedgerEntries(page = 1, perPage = 25, expand: string[] = []): Promise<ListResponse<LedgerEntry>> {
    const expandQuery = expand.length > 0 ? `&expand=${expand.join(',')}` : '';
    const targetUrl = `${this.billettoApiBase}/ledger_entries?page=${page}&per_page=${perPage}${expandQuery}&sort=-created_at`;
    const proxyUrl = `${CORS_PROXY_URL}${targetUrl}`;
    const response = await this.makeRequest(proxyUrl, REQUEST_TIMEOUT, targetUrl);
    return this.parseListResponse<LedgerEntry>(response);
  }
  
  async getCampaigns(page = 1, perPage = 25, expand: string[] = []): Promise<ListResponse<Campaign>> {
    const expandQuery = expand.length > 0 ? `&expand=${expand.join(',')}` : '';
    const targetUrl = `${this.billettoApiBase}/campaigns?page=${page}&per_page=${perPage}${expandQuery}&sort=-created_at`;
    const proxyUrl = `${CORS_PROXY_URL}${targetUrl}`;
    const response = await this.makeRequest(proxyUrl, REQUEST_TIMEOUT, targetUrl);
    return this.parseListResponse<Campaign>(response);
  }

  async getTargetGroups(page = 1, perPage = 25): Promise<ListResponse<TargetGroup>> {
    const targetUrl = `${this.billettoApiBase}/target_groups?page=${page}&per_page=${perPage}&sort=-created_at`;
    const proxyUrl = `${CORS_PROXY_URL}${targetUrl}`;
    const response = await this.makeRequest(proxyUrl, REQUEST_TIMEOUT, targetUrl);
    return this.parseListResponse<TargetGroup>(response);
  }

  async getTargetGroupMembers(groupId: string, page = 1, perPage = 50): Promise<ListResponse<TargetGroupMember>> {
    const targetUrl = `${this.billettoApiBase}/target_groups/${groupId}/members?page=${page}&per_page=${perPage}`;
    const proxyUrl = `${CORS_PROXY_URL}${targetUrl}`;
    const response = await this.makeRequest(proxyUrl, REQUEST_TIMEOUT, targetUrl);
    return this.parseListResponse<TargetGroupMember>(response);
  }
  
  async getEventOrders(eventId: string, page = 1, perPage = 100): Promise<ListResponse<Order>> {
    const targetUrl = `${this.billettoApiBase}/events/${eventId}/orders?page=${page}&per_page=${perPage}&sort=created_at&expand=order_lines`;
    const proxyUrl = `${CORS_PROXY_URL}${targetUrl}`;
    const response = await this.makeRequest(proxyUrl, REQUEST_TIMEOUT, targetUrl);
    return this.parseListResponse<Order>(response);
  }

  async getEventLedgerEntries(eventId: string, page = 1, perPage = 100): Promise<ListResponse<LedgerEntry>> {
    const targetUrl = `${this.billettoApiBase}/events/${eventId}/ledger_entries?page=${page}&per_page=${perPage}&sort=-created_at`;
    const proxyUrl = `${CORS_PROXY_URL}${targetUrl}`;
    const response = await this.makeRequest(proxyUrl, REQUEST_TIMEOUT, targetUrl);
    return this.parseListResponse<LedgerEntry>(response);
  }
}

export default BillettoApiClient;
