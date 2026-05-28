# Business Requirements Document (BRD)

## Project: Garage Financial Simulator

### 1. Overview

The goal of this project is to build a simple, highly visual, and interactive single-page web application (Dashboard) to help a family evaluate financial scenarios regarding their vehicles. The system will simulate selling existing cars, purchasing new or used alternatives, and projecting the total financial impact—combining ongoing fixed costs and vehicle depreciation—over a configurable timeline (e.g., 1, 3, or 5 years).

---

### 2. Functional Requirements

#### Module 1: Current Garage Management (Sell vs. Keep)

- **Existing Vehicle Inventory:** The system must display currently owned vehicles as visual cards (e.g., Mercedes C200 (2025), Volvo XC40 (2020)).
- **Decision Parameters:** For each current vehicle, the user can select whether to **Keep** or **Sell**:
- **If Selling:** The user can manually input the expected realistic sale price or apply a percentage discount (to account for factors like high mileage or a salvage/accident history) directly against the current FIPE market value.
- **If Keeping:** The user can input estimated annual recurring costs for insurance and maintenance.
- **Market Value Integration:** The system must automatically fetch the vehicle's baseline market value using a live automotive pricing index API based on the make, model, year, and trim.
- **Depreciation Forecasting:** The system will estimate future vehicle values by analyzing the price differences between consecutive model years in the current index dataset (e.g., to predict a 2025 model's value in 2028, it references the current market price of the 2023 model).

#### Module 2: New Purchase Simulations

- **Dynamic Vehicle Search (API-driven):** The user must be able to add new vehicles to the simulation using a multi-step dropdown search (Make $\rightarrow$ Model $\rightarrow$ Year $\rightarrow$ Trim) powered entirely by the external pricing API, removing any need for manual data entry.
- **Purchase Attributes:** For every simulated purchase, the user defines:
- **Condition:** New or Used.
- **Acquisition Cost:** The actual negotiated purchase price.
- **Operational Estimates:** Inputs for expected annual insurance and maintenance costs.
- **Fuel/Energy Type:** To estimate recurring fuel or charging expenditures.

#### Module 3: Calculation & Projection Engine

- **Global Timeline Slider:** A master timeline controller allows the user to scale the simulation horizon dynamically from 1 to 5 years.
- **Automated Automotive Tax (IPVA):** The system must automatically calculate the annual state vehicle tax based on the projected market value and a configurable flat regional tax rate (e.g., 2% for Santa Catarina, Brazil).
- **Net Worth & Liquidity Tracking:** At any point on the timeline, the engine must compute:
- **Cash in Hand:** Capital generated from sales minus capital spent on new purchases.
- **Asset Equity:** The depreciated value of all retained or newly purchased vehicles at the end of the selected period.
- **Total Portfolio Value:** Cash in Hand + Asset Equity.
- **Total Cost of Ownership (TCO):** A cumulative sum of all taxes, insurance, maintenance, and operational expenses incurred across all vehicles during the simulated timeframe.

#### Module 4: Comparison UI & Data Visualization

- **Scenario Management:** Users must be able to save unique vehicle configurations as distinct "Scenarios" (e.g., *Scenario 1: Keep Volvo + Buy EV*; *Scenario 2: Liquidata Both + Buy Compact SUVs*).
- **Side-by-Side Comparison:** A dedicated interface to compare up to three saved scenarios concurrently.
- **Visual Data Charts:**
- **Cumulative Costs:** A bar chart comparing total operational cash drain per scenario at the end of the timeline.
- **Net Worth Trajectory:** A line chart displaying the decline of total portfolio value over time due to vehicle depreciation.
- **Immediate Liquidity Indicator:** A prominent metric showing immediate "free cash flow" generated right after the initial transaction phase.

---

### 3. Non-Functional Requirements

- **Intuitive User Experience (UX):** The interface must be exceptionally clean, relying on card-based layouts and sliders rather than complex data grids, ensuring it is highly accessible for non-technical users.
- **Real-Time Performance:** Calculations and visualizations must update instantaneously when the timeline slider or input fields are modified, providing immediate feedback without forcing a full page reload.
- **Local Storage Persistence:** To keep the initial version lightweight, user-created scenarios must persist locally within the user's browser session (using web storage), removing the friction of setting up email or password authentication.
- **Device Responsiveness:** The system layout must adapt to desktop and tablet screens, prioritizing comfortable whitespace for rendering comparative charts and tables side-by-side.

