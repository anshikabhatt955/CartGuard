# seed_data.py - Seed realistic Indian checkout reports for CartGuard
import sqlite3
import hashlib
import random
from datetime import datetime, timedelta
from database import get_connection, init_db

def seed():
    init_db()
    conn = get_connection()
    cursor = conn.cursor()

    # Clear existing to ensure clean seed
    cursor.execute("DELETE FROM reports;")

    seed_reports = [
        # localhost / 127.0.0.1 (Mock checkout testing domain)
        ("127.0.0.1", "http://127.0.0.1:5500/cart.html", "basket_sneaking", "Basket Sneaking", "CCPA Guidelines 2023, Section 6", "HIGH", "Pre-ticked Travel Insurance ₹99 and Carbon Offset ₹29"),
        ("127.0.0.1", "http://127.0.0.1:5500/cart.html", "basket_sneaking", "Basket Sneaking", "CCPA Guidelines 2023, Section 6", "HIGH", "Priority handling automatically added to basket"),
        ("127.0.0.1", "http://127.0.0.1:5500/cart.html", "basket_sneaking", "Basket Sneaking", "CCPA Guidelines 2023, Section 6", "HIGH", "Checked add-on fee without user affirmative opt-in"),
        ("127.0.0.1", "http://127.0.0.1:5500/cart.html", "false_urgency", "False Urgency", "CCPA Guidelines 2023, Section 5", "HIGH", "Timer reset on refresh: 04:59 countdown"),
        ("127.0.0.1", "http://127.0.0.1:5500/cart.html", "false_urgency", "False Urgency", "CCPA Guidelines 2023, Section 5", "HIGH", "High Demand Alert - Only 1 seat left at this price"),
        ("127.0.0.1", "http://127.0.0.1:5500/cart.html", "false_urgency", "False Urgency", "CCPA Guidelines 2023, Section 5", "HIGH", "Artificially expiring fare holding timer"),
        ("127.0.0.1", "http://127.0.0.1:5500/payment.html", "drip_pricing", "Drip Pricing", "CCPA Guidelines 2023, Section 7", "HIGH", "Convenience Fee ₹450 revealed only on final card screen"),
        ("127.0.0.1", "http://127.0.0.1:5500/payment.html", "drip_pricing", "Drip Pricing", "CCPA Guidelines 2023, Section 7", "HIGH", "Platform Infrastructure Charge ₹350 not in base fare"),
        ("127.0.0.1", "http://127.0.0.1:5500/payment.html", "drip_pricing", "Drip Pricing", "CCPA Guidelines 2023, Section 7", "HIGH", "₹800 undisclosed fees added post-cart"),
        ("127.0.0.1", "http://127.0.0.1:5500/payment.html", "confirm_shaming", "Confirm Shaming", "CCPA Guidelines 2023, Section 8", "MEDIUM", "Opt-out button: 'No, I don't want to save money and prefer risking delays'"),
        ("127.0.0.1", "http://127.0.0.1:5500/payment.html", "confirm_shaming", "Confirm Shaming", "CCPA Guidelines 2023, Section 8", "MEDIUM", "Guilt wording on flight protection decline"),
        ("127.0.0.1", "http://127.0.0.1:5500/cart.html", "subscription_trap", "Subscription Trap", "CCPA Guidelines 2023, Section 9", "HIGH", "Free 30-day VIP Club trial auto-renews at ₹299/mo"),
        ("127.0.0.1", "http://127.0.0.1:5500/cart.html", "subscription_trap", "Subscription Trap", "CCPA Guidelines 2023, Section 9", "HIGH", "Bundled subscription with hidden recurring auto-debit"),

        # flyfast.in (Airline OTA)
        ("flyfast.in", "https://flyfast.in/flights/select", "false_urgency", "False Urgency", "CCPA Guidelines 2023, Section 5", "HIGH", "Only 2 seats remaining at ₹3,200!"),
        ("flyfast.in", "https://flyfast.in/checkout", "basket_sneaking", "Basket Sneaking", "CCPA Guidelines 2023, Section 6", "HIGH", "Auto-checked travel insurance ₹149"),
        ("flyfast.in", "https://flyfast.in/checkout", "basket_sneaking", "Basket Sneaking", "CCPA Guidelines 2023, Section 6", "HIGH", "Pre-selected carbon offset contribution ₹40"),
        ("flyfast.in", "https://flyfast.in/checkout", "basket_sneaking", "Basket Sneaking", "CCPA Guidelines 2023, Section 6", "HIGH", "Seat selection pre-charged"),
        ("flyfast.in", "https://flyfast.in/pay", "drip_pricing", "Drip Pricing", "CCPA Guidelines 2023, Section 7", "HIGH", "Convenience surcharge ₹399 added on payment page"),
        ("flyfast.in", "https://flyfast.in/pay", "drip_pricing", "Drip Pricing", "CCPA Guidelines 2023, Section 7", "HIGH", "Airport development fee added after summary"),
        ("flyfast.in", "https://flyfast.in/pay", "drip_pricing", "Drip Pricing", "CCPA Guidelines 2023, Section 7", "HIGH", "Gateway charge hidden until OTP"),
        ("flyfast.in", "https://flyfast.in/checkout", "confirm_shaming", "Confirm Shaming", "CCPA Guidelines 2023, Section 8", "MEDIUM", "'No, I prefer risking my baggage without protection'"),

        # busexpress.in (Bus booking)
        ("busexpress.in", "https://busexpress.in/seat-layout", "false_urgency", "False Urgency", "CCPA Guidelines 2023, Section 5", "HIGH", "38 people looking at this bus right now!"),
        ("busexpress.in", "https://busexpress.in/seat-layout", "false_urgency", "False Urgency", "CCPA Guidelines 2023, Section 5", "HIGH", "Countdown: 09:59 to confirm"),
        ("busexpress.in", "https://busexpress.in/seat-layout", "false_urgency", "False Urgency", "CCPA Guidelines 2023, Section 5", "HIGH", "Seats selling out in 2 minutes"),
        ("busexpress.in", "https://busexpress.in/passenger", "basket_sneaking", "Basket Sneaking", "CCPA Guidelines 2023, Section 6", "HIGH", "Pre-ticked bus insurance ₹25"),
        ("busexpress.in", "https://busexpress.in/passenger", "basket_sneaking", "Basket Sneaking", "CCPA Guidelines 2023, Section 6", "HIGH", "Pre-ticked donation for drivers ₹10"),
        ("busexpress.in", "https://busexpress.in/passenger", "basket_sneaking", "Basket Sneaking", "CCPA Guidelines 2023, Section 6", "HIGH", "Emergency medical cover pre-checked"),
        ("busexpress.in", "https://busexpress.in/pay", "drip_pricing", "Drip Pricing", "CCPA Guidelines 2023, Section 7", "HIGH", "State transport booking fee ₹65 added at pay"),
        ("busexpress.in", "https://busexpress.in/pay", "drip_pricing", "Drip Pricing", "CCPA Guidelines 2023, Section 7", "HIGH", "AC maintenance charge added at checkout"),

        # shopquick.in (Fashion / Electronics e-commerce)
        ("shopquick.in", "https://shopquick.in/cart", "subscription_trap", "Subscription Trap", "CCPA Guidelines 2023, Section 9", "HIGH", "VIP Express 15-day free trial auto-bills ₹499/mo"),
        ("shopquick.in", "https://shopquick.in/cart", "subscription_trap", "Subscription Trap", "CCPA Guidelines 2023, Section 9", "HIGH", "Annual membership auto-enrolled"),
        ("shopquick.in", "https://shopquick.in/cart", "subscription_trap", "Subscription Trap", "CCPA Guidelines 2023, Section 9", "HIGH", "Requires phone call to cancel free trial"),
        ("shopquick.in", "https://shopquick.in/p/smartphone", "false_urgency", "False Urgency", "CCPA Guidelines 2023, Section 5", "HIGH", "Sale ends in 00:15:00!"),
        ("shopquick.in", "https://shopquick.in/cart", "confirm_shaming", "Confirm Shaming", "CCPA Guidelines 2023, Section 8", "MEDIUM", "'No thanks, I dislike saving money on delivery'"),
        ("shopquick.in", "https://shopquick.in/cart", "confirm_shaming", "Confirm Shaming", "CCPA Guidelines 2023, Section 8", "MEDIUM", "'I will pay full price and forgo cashback'"),
        ("shopquick.in", "https://shopquick.in/cart", "confirm_shaming", "Confirm Shaming", "CCPA Guidelines 2023, Section 8", "MEDIUM", "'I reject guaranteed shipping'"),

        # ticketfest.in (Events & Movies ticketing)
        ("ticketfest.in", "https://ticketfest.in/event/rock", "false_urgency", "False Urgency", "CCPA Guidelines 2023, Section 5", "HIGH", "Only 4 Phase-1 passes left!"),
        ("ticketfest.in", "https://ticketfest.in/event/rock", "false_urgency", "False Urgency", "CCPA Guidelines 2023, Section 5", "HIGH", "Holding your tickets for 05:00 mins"),
        ("ticketfest.in", "https://ticketfest.in/event/rock", "false_urgency", "False Urgency", "CCPA Guidelines 2023, Section 5", "HIGH", "110 people in queue"),
        ("ticketfest.in", "https://ticketfest.in/checkout", "drip_pricing", "Drip Pricing", "CCPA Guidelines 2023, Section 7", "HIGH", "Internet handling fee ₹180 per ticket"),
        ("ticketfest.in", "https://ticketfest.in/checkout", "drip_pricing", "Drip Pricing", "CCPA Guidelines 2023, Section 7", "HIGH", "Venue maintenance cess ₹50 added at end"),
        ("ticketfest.in", "https://ticketfest.in/checkout", "drip_pricing", "Drip Pricing", "CCPA Guidelines 2023, Section 7", "HIGH", "Booking service fee revealed on payment page"),

        # cleandeal.in (Clean merchant benchmark - only 1 minor report)
        ("cleandeal.in", "https://cleandeal.in/checkout", "false_urgency", "False Urgency", "CCPA Guidelines 2023, Section 5", "LOW", "Seasonal festive badge")
    ]

    for item in seed_reports:
        domain, url, p_type, o_name, ccpa, sev, evidence = item
        # Random timestamp within last 7 days
        days_ago = random.randint(0, 7)
        hours_ago = random.randint(1, 23)
        created_at = (datetime.now() - timedelta(days=days_ago, hours=hours_ago)).strftime('%Y-%m-%d %H:%M:%S')
        rep_hash = hashlib.sha256(f"{domain}_{created_at}_{random.random()}".encode()).hexdigest()[:16]

        cursor.execute("""
            INSERT INTO reports (domain, url, pattern_type, official_name, ccpa_section, severity, evidence_text, reporter_hash, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (domain, url, p_type, o_name, ccpa, sev, evidence, rep_hash, created_at))

    conn.commit()
    conn.close()
    print(f"Seeded {len(seed_reports)} realistic violation reports into database.")

if __name__ == "__main__":
    seed()
