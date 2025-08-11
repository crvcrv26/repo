# Payment System Implementation

## Overview

The payment system allows admins to manage monthly payments from auditors and field agents. The system tracks payment dues, rates, and payment status.

## Features

### For Admins:
- Set monthly payment rates for auditors and field agents
- Generate monthly payment records
- View payment summary and statistics
- Mark payments as paid
- Track overdue payments
- View detailed payment history

### For Auditors & Field Agents:
- View their payment dues
- Track payment history
- See payment status (pending, paid, overdue)
- View admin contact information

## Database Schema

### Payment Model (`models/Payment.js`)
```javascript
{
  adminId: ObjectId,        // Admin who receives payment
  userId: ObjectId,         // User who pays (auditor/field agent)
  userRole: String,         // 'auditor' or 'fieldAgent'
  monthlyAmount: Number,    // Monthly payment amount
  paymentMonth: Number,     // 1-12
  paymentYear: Number,      // Year
  periodStart: Date,        // Period start date
  periodEnd: Date,          // Period end date
  dueDate: Date,           // Due date (end of month)
  status: String,          // 'pending', 'paid', 'overdue'
  paidAmount: Number,      // Actual amount paid
  paidDate: Date,          // When payment was made
  userCreatedAt: Date,     // User creation date
  wasDeleted: Boolean,     // If user was deleted
  rateChanges: Array,      // Track rate changes
  notes: String,           // Payment notes
  isActive: Boolean        // Record status
}
```

### User Model Updates
Added `paymentRates` field to User model:
```javascript
paymentRates: {
  auditorRate: Number,     // Monthly rate for auditors
  fieldAgentRate: Number   // Monthly rate for field agents
}
```

## API Endpoints

### Admin Payment Management
- `GET /api/payments/rates` - Get current payment rates
- `PUT /api/payments/rates` - Update payment rates
- `GET /api/payments/admin-summary` - Get payment summary for admin
- `GET /api/payments/admin-details` - Get detailed payment list
- `PUT /api/payments/:id/mark-paid` - Mark payment as paid
- `POST /api/payments/generate-monthly` - Generate monthly payments

### User Payment Dues
- `GET /api/payments/user-dues` - Get user's payment dues

## Frontend Pages

### Admin Payment Page (`/admin-payments`)
- Payment summary cards (expected, paid, pending, overdue amounts)
- Current payment rates display
- Payment details table with filters
- Generate monthly payments
- Mark payments as paid

### User Payment Page (`/user-payments`)
- Payment summary (pending, paid, overdue)
- Payment history table
- Payment information and guidelines

## Payment Logic

### Due Date Calculation
- Payments are due at the end of each month
- If a user is created on July 15th, their first payment is due on July 31st
- Subsequent payments are due on the last day of each month (August 31st, September 30th, etc.)
- This ensures consistent billing cycles with predictable due dates

### Payment Period Calculation
- **First Month (Creation Month)**: Period starts from user creation date to end of month
  - Example: User created on July 15th
  - Period: "15 Jul - 31 Jul"
- **Subsequent Months**: Period covers the full month
  - Example: August period: "1 Aug - 31 Aug"
  - Example: September period: "1 Sep - 30 Sep"

### Payment Amount Calculation
- **First Month (Creation Month)**: Prorated based on remaining days from creation date
  - Example: User created on July 15th with ₹5000 monthly rate
  - Days in July: 31, Remaining days: 17 (15th to 31st)
  - First month amount: ₹5000 × (17/31) = ₹2741.94
- **Subsequent Months**: Full monthly rate
  - Example: August payment = ₹5000 (full rate)

### Rate Changes
- Rate changes are tracked in the `rateChanges` array
- Changes affect future payments, not past ones
- Each change includes old amount, new amount, and timestamp

### User Deletion Handling
- If a user is deleted before their due date, the payment is still counted
- The `wasDeleted` flag tracks this scenario
- Deleted users' payments are included in admin summaries

## Usage Instructions

### Setting Up Payment Rates (Admin)
1. Go to Payment Management page
2. Click "Update Rates"
3. Set monthly rates for auditors and field agents
4. Save changes

### Generating Monthly Payments (Admin)
1. Go to Payment Management page
2. Click "Generate Payments"
3. Select month and year
4. System creates payment records for all active users

### Marking Payments as Paid (Admin)
1. View payment details in the table
2. Click the eye icon next to a payment
3. Enter paid amount and optional notes
4. Mark as paid

### Viewing Payment Dues (Users)
1. Go to "My Payments" page
2. View payment summary and history
3. Filter by status if needed

## Test Data

Run the test script to create sample data:
```bash
node test-payment-system.js
```

This creates:
- Test admin with payment rates
- Test auditor and field agent
- Sample payments (pending, paid, overdue)

## Security

- All endpoints require authentication
- Admins can only manage payments for users they created
- Users can only view their own payment dues
- Rate changes are tracked for audit purposes

## Future Enhancements

1. **Payment Gateway Integration**: Add actual payment processing
2. **Automated Reminders**: Send payment reminders via email/SMS
3. **Payment Reports**: Generate detailed payment reports
4. **Bulk Operations**: Mark multiple payments as paid
5. **Payment History**: Track payment method and transaction IDs
6. **Late Fees**: Implement late fee calculations
7. **Payment Plans**: Allow installment payments

## Technical Notes

- Uses MongoDB aggregation for efficient queries
- Implements proper indexing for performance
- Includes virtual fields for calculated data
- Follows RESTful API conventions
- Includes comprehensive error handling
- Uses React Query for frontend state management

## File Structure

```
models/
  ├── Payment.js          # Payment model
  └── User.js             # Updated with payment rates

routes/
  └── payments.js         # Payment API routes

frontend/src/pages/
  ├── AdminPayments.tsx   # Admin payment management
  └── UserPayments.tsx    # User payment dues

frontend/src/services/
  └── api.ts              # Updated with payment API

frontend/src/components/
  └── Layout.tsx          # Updated with payment navigation
```

## Testing

The system includes:
- Unit tests for payment calculations
- Integration tests for API endpoints
- Frontend component tests
- End-to-end payment flow tests

Run tests with:
```bash
npm test
```
