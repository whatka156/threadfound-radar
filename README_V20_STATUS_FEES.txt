v20 item status workflow + selling fee helper.

Replace these in GitHub:
- index.html
- service-worker.js

Added:
- Item workflow stages: Bought, Arrived, Testing, Tested, Listed, Reserved.
- Sold workflow stages: Sold, Posted, Completed.
- Each item card now has a Next status button.
- Refund now moves a sold item back into stock as Refunded.
- Mark Sold now includes a fee helper:
  - No fees
  - 5%
  - 10%
  - eBay estimate
  - Custom
- Sale totals now show sale price, fees, net sale and final profit more clearly.
