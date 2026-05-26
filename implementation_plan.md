# Implementation Plan - Digital Receipt Modal

We will add a beautiful, retail-style **Digital Receipt Modal** to the profile transaction tabs. Users will be able to tap a "Receipt" button on any completed sale or purchase card to display a premium visual receipt complete with a transaction ID, date, buyer/seller details, payment method, pricing breakdown, and a simulated barcode.

## Proposed Changes

### Mobile Client

#### [MODIFY] [ProfileScreen.js](file:///Users/adamanwar/Desktop/FYP/mobile/src/screens/main/ProfileScreen.js)
- **State Initialization:** Add `showReceiptModal` state to control the visibility of the digital receipt.
- **Transaction Card Footer:**
  - Add a "Receipt" action button (`TouchableOpacity` with a receipt icon) visible on all cards where `status === 'COMPLETED'`.
- **Digital Receipt Modal Component:**
  - Render a modal overlay with premium styling that represents a clean paper store receipt:
    - Scalloped edge visual aesthetics or dashed borders.
    - Large green checkmark indicator showing "Transaction Successful".
    - Stamp-style status indicator ("PAID").
    - Chronological invoice details (e.g., Receipt Number `MPL-TX-[ID]`, Date, Buyer, Seller, and Payment Method).
    - Price summary lines (Item Price, Discounts, and Total Amount Paid).
    - Environmental impact notice linking the purchase back to the Eco-Impact engine (e.g., "Sustainable Purchase: Saves ~X kg of CO2!").
    - A clean barcode graphic using `Ionicons` (`barcode-outline`).
- **Styling updates:** Define receipt paper vouchers, stamp badges, dashed dividing lines, pricing totals, and action buttons in the stylesheet.

---

## Verification Plan

### Manual Verification
- Navigate to the **Profile** screen.
- Go to the **Purchases** or **Sales** tab.
- Find a transaction marked **COMPLETED** (or complete a pending one).
- Verify that a new **"Receipt"** button is displayed on the card.
- Tap **Receipt** and verify that:
  - The modal slides up with a clean paper voucher layout.
  - The correct final price and transaction details (Buyer, Seller, Payment Method) are rendered.
  - The receipt correctly displays the transaction ID: `MPL-TX-[id]`.
  - The simulated barcode and eco-impact message are visible.
- Close the modal and verify smooth animation transition back to the profile list.
