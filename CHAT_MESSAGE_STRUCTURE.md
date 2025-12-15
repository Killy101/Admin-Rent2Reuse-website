# Chat Message Structure Documentation

## Overview
This document outlines the expected message structure for the chat collection in Firestore. Mobile developers should follow this structure when creating messages in the chat system.

## Base Message Structure

Every message in the `chat/{chatId}/messages` subcollection should follow this structure:

```typescript
{
  createdAt: Timestamp,
  text: string,
  type: string,
  senderId: string,
  read: boolean,
  readAt?: Timestamp,
  rentRequestId?: string,
  data?: object  // Optional payload for complex message types
}
```

## Message Type Details

### 1. Standard Text Message
**Type:** `"message"`

```json
{
  "createdAt": "2025-12-09T10:30:00Z",
  "text": "Hi, is this item still available?",
  "type": "message",
  "senderId": "user123",
  "read": false
}
```

---

### 2. Rent Request Message
**Type:** `"rentRequest"`

When a user creates a rental request, send a message with the following structure:

```json
{
  "createdAt": "2025-12-09T10:30:00Z",
  "text": "I would like to rent this item for 5 days starting December 11, 2025",
  "type": "rentRequest",
  "senderId": "renter_user_id",
  "read": false,
  "rentRequestId": "request_123",
  "data": {
    "itemDetails": {
      "itemId": "item_456",
      "name": "Mountain Bike",
      "price": 500,
      "image": "https://example.com/image.jpg",
      "pickupTime": 530,
      "startDate": "December 11, 2025",
      "endDate": "December 16, 2025",
      "rentalDays": 5
    }
  }
}
```

**Field Descriptions:**
- `text`: Human-readable request message
- `rentRequestId`: Reference to the rentRequest document ID
- `data.itemDetails.pickupTime`: Time in minutes from midnight (530 = 08:50 AM)
- `data.itemDetails.startDate`: Date string format (e.g., "December 11, 2025")
- `data.itemDetails.endDate`: Date string format (e.g., "December 16, 2025")

---

### 3. Owner Confirmation Message
**Type:** `"ownerConfirmation"`

When the owner confirms a rental request:

```json
{
  "createdAt": "2025-12-09T11:00:00Z",
  "text": "I confirm the rental request. The item is available on those dates.",
  "type": "ownerConfirmation",
  "senderId": "owner_user_id",
  "read": false,
  "rentRequestId": "request_123",
  "data": {
    "confirmationDetails": {
      "requestId": "request_123",
      "status": "confirmed",
      "timestamp": "2025-12-09T11:00:00Z"
    }
  }
}
```

**Field Descriptions:**
- `text`: Confirmation message from owner
- `data.confirmationDetails.status`: Can be "confirmed", "pending", "rejected"

---

### 4. Status Update Message
**Type:** `"statusUpdate"`

For tracking rental status changes:

```json
{
  "createdAt": "2025-12-09T14:30:00Z",
  "text": "Rental status has been updated to accepted",
  "type": "statusUpdate",
  "senderId": "admin",
  "read": false,
  "data": {
    "status": "accepted",
    "previousStatus": "pending"
  }
}
```

---

### 5. Admin Notification Message
**Type:** `"admin_notification"`

For system alerts:

```json
{
  "createdAt": "2025-12-09T15:00:00Z",
  "text": "⚠️ Admin Alert: Your rental is currently marked as \"accepted\". Please review this transaction or contact support if there are any issues.",
  "type": "admin_notification",
  "senderId": "admin",
  "read": false
}
```

---

### 6. Payment Confirmation Message
**Type:** `"payment"`

For payment-related messages:

```json
{
  "createdAt": "2025-12-09T12:00:00Z",
  "text": "Initial payment of ₱250 has been received",
  "type": "payment",
  "senderId": "admin",
  "read": false,
  "data": {
    "amount": 250,
    "currency": "PHP",
    "paymentType": "initial_payment",
    "paymentMethod": "card",
    "transactionId": "txn_789"
  }
}
```

---

## Mobile Implementation Guide

### When Creating Messages:

1. **Always set these fields:**
   - `createdAt`: Current timestamp
   - `text`: Human-readable message
   - `type`: Message type (see above)
   - `senderId`: Current user ID
   - `read`: false (initially)

2. **Optional fields based on type:**
   - `rentRequestId`: Include if message relates to a specific request
   - `readAt`: Only set if message is already read
   - `data`: Include complex payload only for specific message types

3. **Data Payload Rules:**
   - Only include `data` object for types: `rentRequest`, `ownerConfirmation`, `payment`, `statusUpdate`
   - Ensure all nested fields are properly structured
   - Use the exact field names as shown in examples

### Example - Creating a Rent Request Message (Mobile):

```javascript
// JavaScript/React Native Example
const createRentRequestMessage = async (chatId, rentDetails) => {
  const messagesRef = collection(db, 'chat', chatId, 'messages');
  
  const message = {
    createdAt: new Date(),
    text: `I would like to rent "${rentDetails.itemName}" for ${rentDetails.rentalDays} days`,
    type: 'rentRequest',
    senderId: currentUserId,
    read: false,
    rentRequestId: rentDetails.requestId,
    data: {
      itemDetails: {
        itemId: rentDetails.itemId,
        name: rentDetails.itemName,
        price: rentDetails.itemPrice,
        image: rentDetails.itemImage,
        pickupTime: rentDetails.pickupTimeInMinutes, // e.g., 530
        startDate: rentDetails.startDateString, // e.g., "December 11, 2025"
        endDate: rentDetails.endDateString, // e.g., "December 16, 2025"
        rentalDays: rentDetails.rentalDays
      }
    }
  };
  
  await addDoc(messagesRef, message);
};
```

---

## Admin Dashboard Display

The admin dashboard (`/admin/chatLogs`) will:

1. **For `rentRequest` messages:**
   - Display item name, price, pickup time, dates, and rental days
   - Show formatted dates and times
   - Display item image (if provided)

2. **For `ownerConfirmation` messages:**
   - Show confirmation process steps
   - Display request ID and confirmation status
   - Show confirmation timestamp

3. **For other message types:**
   - Display standard message with type badge
   - Show sender info and timestamp
   - Include any additional data fields

---

## Important Notes

- **Timestamps:** Use Firestore Timestamp objects or ISO 8601 date strings
- **Pickup Time Format:** Always use minutes from midnight (0-1439)
- **Date Format:** Use "Month Day, Year" format (e.g., "December 11, 2025")
- **Currency:** Always use ₱ for Philippines Peso
- **Sender ID:** Use Firebase Auth UID

---

## Query Examples

### Get all rent requests in a chat:
```javascript
const rentMessages = messages.filter(m => m.type === 'rentRequest');
```

### Get unread messages:
```javascript
const unreadMessages = messages.filter(m => !m.read);
```

### Get messages from a specific date:
```javascript
const dateStart = new Date('2025-12-09').getTime() / 1000;
const dateEnd = new Date('2025-12-10').getTime() / 1000;
const messagesOnDate = messages.filter(m => 
  m.createdAt.seconds >= dateStart && m.createdAt.seconds < dateEnd
);
```
