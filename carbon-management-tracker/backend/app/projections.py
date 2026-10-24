# Carbon net worth = carbon emissions - eco savings
# Lower is better. Negative means you saved more CO2 than you emitted.
#wire it to ur database later 

from datetime import date, datetime
import calendar


def _parse_date(value) -> date:
    """Accept a date object or a 'YYYY-MM-DD' string."""
    if isinstance(value, date):
        return value
    return datetime.strptime(value[:10], "%Y-%m-%d").date()


def carbon_net_worth(entries: list[dict], year: int | None = None) -> dict:
    """
    Net worth for one year.
    Each entry looks like:
        {"date": "2026-03-14", "type": "emission" or "eco", "kg_co2e": 12.5}
    """
    year = year or date.today().year
    emissions = 0.0
    eco = 0.0

    for e in entries:
        if _parse_date(e["date"]).year != year:
            continue
        if e["type"] == "emission":
            emissions += e["kg_co2e"]
        elif e["type"] == "eco":
            eco += e["kg_co2e"]

    return {
        "year": year,
        "emissions": round(emissions, 2),
        "eco": round(eco, 2),
        "net_worth": round(emissions - eco, 2),
    }


def this_year_net_worth(entries: list[dict]) -> dict:
    return carbon_net_worth(entries, date.today().year)


def last_year_net_worth(entries: list[dict]) -> dict:
    return carbon_net_worth(entries, date.today().year - 1)


def project_year_end(entries: list[dict], year: int | None = None) -> dict:
    """
    Estimate where the year will finish, based on the pace so far.
    For a past year this just returns the actual totals.
    """
    today = date.today()
    year = year or today.year
    actual = carbon_net_worth(entries, year)

    if year < today.year:
        return {**actual, "projected": False}

    days_in_year = 366 if calendar.isleap(year) else 365
    days_elapsed = (today - date(year, 1, 1)).days + 1
    factor = days_in_year / days_elapsed

    emissions = round(actual["emissions"] * factor, 2)
    eco = round(actual["eco"] * factor, 2)

    return {
        "year": year,
        "emissions": emissions,
        "eco": eco,
        "net_worth": round(emissions - eco, 2),
        "projected": True,
    }


def compare_years(entries: list[dict]) -> dict:
    """This year vs last year, with the change in net worth."""
    current = this_year_net_worth(entries)
    previous = last_year_net_worth(entries)
    change = round(current["net_worth"] - previous["net_worth"], 2)

    return {
        "this_year": current,
        "last_year": previous,
        "change": change,  # negative = improved
        "improved": change < 0,
    }


if __name__ == "__main__":
    sample = [
        {"date": "2025-06-01", "type": "emission", "kg_co2e": 400},
        {"date": "2025-09-01", "type": "eco", "kg_co2e": 120},
        {"date": "2026-01-15", "type": "emission", "kg_co2e": 300},
        {"date": "2026-02-10", "type": "eco", "kg_co2e": 150},
    ]
    print(this_year_net_worth(sample))
    print(last_year_net_worth(sample))
    print(project_year_end(sample))
    print(compare_years(sample))