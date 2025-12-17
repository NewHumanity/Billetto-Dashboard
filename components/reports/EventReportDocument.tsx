
import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import { EventDetails } from '../../types';

// Define styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#334155'
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 15,
  },
  brand: {
    fontSize: 10,
    color: '#94A3B8',
    marginBottom: 5,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontSize: 24,
    color: '#0F172A',
    marginBottom: 5,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#1E90FF', // Brand Primary
    fontWeight: 'bold',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 5,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    // Removed gap due to compatibility issues with older react-pdf versions or specific layout engines
  },
  summaryCard: {
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 4,
    flexGrow: 1,
    alignItems: 'center',
    marginHorizontal: 5, // Replaces gap
  },
  summaryLabel: {
    fontSize: 8,
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    padding: 8,
    alignItems: 'center',
  },
  tableHeader: {
    backgroundColor: '#F1F5F9',
    fontWeight: 'bold',
    color: '#475569',
  },
  tableCell: {
    flex: 1,
  },
  tableCellRight: {
    flex: 1,
    textAlign: 'right',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 10,
  }
});

interface EventReportDocumentProps {
  details: EventDetails;
}

const formatCurrency = (value: number, currency: string) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value / 100);
};

const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
};

// Safety function to prevent "reading 'Hidden'" error in React-PDF by ensuring value is string/number
const safeText = (value: any) => {
    if (value === null || value === undefined || value === false || value === true) return '';
    return String(value);
};

export const EventReportDocument: React.FC<EventReportDocumentProps> = ({ details }) => {
  const { event, stats, financialSummary, ticketGroups, salesByChannel } = details;
  const currency = event.currency || 'EUR';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.brand}>Billetto Executive Report</Text>
          <Text style={styles.title}>{safeText(event.name || 'Untitled Event')}</Text>
          <Text style={styles.subtitle}>
            {safeText(formatDate(event.starts_at))} {event.location && typeof event.location === 'object' ? `• ${safeText(event.location.name)}` : ''}
          </Text>
        </View>

        {/* Executive Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Executive Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Gross Revenue</Text>
              <Text style={styles.summaryValue}>{safeText(formatCurrency(stats.netRevenue, currency))}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Tickets Sold</Text>
              <Text style={styles.summaryValue}>{safeText(stats.totalTicketsSold.toLocaleString())}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Net Payout</Text>
              <Text style={styles.summaryValue}>{financialSummary ? safeText(formatCurrency(financialSummary.netPayout, currency)) : 'N/A'}</Text>
            </View>
          </View>
        </View>

        {/* Ticket Sales Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ticket Sales Breakdown</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={[styles.tableCell, { flex: 2 }]}>Ticket Type</Text>
              <Text style={styles.tableCellRight}>Status</Text>
              <Text style={styles.tableCellRight}>Sold / Cap</Text>
              <Text style={styles.tableCellRight}>Revenue</Text>
            </View>
            {ticketGroups.map((tg) => (
              <View key={tg.id} style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>{safeText(tg.name)}</Text>
                <Text style={styles.tableCellRight}>{safeText(tg.state?.replace(/_/g, ' ') || '-')}</Text>
                <Text style={styles.tableCellRight}>{safeText(tg.sold_count || 0)} / {safeText(tg.quantity || '∞')}</Text>
                <Text style={styles.tableCellRight}>{safeText(formatCurrency(tg.revenue || 0, currency))}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Financial Details */}
        {financialSummary ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Financial Summary</Text>
            <View style={styles.table}>
              <View style={styles.tableRow}>
                <Text style={styles.tableCell}>Gross Revenue</Text>
                <Text style={styles.tableCellRight}>{safeText(formatCurrency(stats.netRevenue, currency))}</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={styles.tableCell}>Billetto Fees</Text>
                <Text style={[styles.tableCellRight, { color: '#EF4444' }]}>{safeText(formatCurrency(financialSummary.billettoFees, currency))}</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={styles.tableCell}>Refunds & Chargebacks</Text>
                <Text style={[styles.tableCellRight, { color: '#F59E0B' }]}>
                  {safeText(formatCurrency((financialSummary.totalRefunded || 0) + (financialSummary.totalChargebacks || 0), currency))}
                </Text>
              </View>
              <View style={[styles.tableRow, { borderBottomWidth: 0, backgroundColor: '#F0F9FF' }]}>
                <Text style={[styles.tableCell, { fontWeight: 'bold' }]}>Net Payout</Text>
                <Text style={[styles.tableCellRight, { fontWeight: 'bold', color: '#1E90FF' }]}>
                  {safeText(formatCurrency(financialSummary.netPayout, currency))}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* Sales Channels */}
        {salesByChannel && salesByChannel.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Sales Channels</Text>
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={styles.tableCell}>Channel</Text>
                <Text style={styles.tableCellRight}>Orders</Text>
              </View>
              {salesByChannel.slice(0, 5).map((channel, idx) => (
                <View key={idx} style={styles.tableRow}>
                  <Text style={styles.tableCell}>{safeText(channel.name)}</Text>
                  <Text style={styles.tableCellRight}>{safeText(channel.count)}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <Text style={styles.footer}>
          Generated by BillettoStats on {new Date().toLocaleDateString()} • Confidential
        </Text>
      </Page>
    </Document>
  );
};
