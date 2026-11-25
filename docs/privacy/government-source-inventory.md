# Government source inventory

**Status: NONE of these sources has been verified yet.** The build environment could not reach any `.gov.ph`
site (blocked by the network policy), so guide content was written as cautious drafts that avoid specific
requirements, fees and processing times, and every government guide is seeded as `in_review` with
`verified_on = NULL`. Production builds show none of them until a content reviewer verifies a source in the
admin portal and publishes (`publish_guide()` enforces this).

| Guide (slug) | Agency | Official URL to verify | Verified on | Verified by | Notes for the reviewer |
|---|---|---|---|---|---|
| sss-membership | Social Security System | https://www.sss.gov.ph | — | — | Confirm current SS number registration route per membership type |
| philhealth-membership | PhilHealth | https://www.philhealth.gov.ph | — | — | Confirm PIN registration process and accepted IDs |
| pagibig-membership | Pag-IBIG Fund | https://www.pagibigfund.gov.ph | — | — | Confirm MID registration process |
| bir-tin | Bureau of Internal Revenue | https://www.bir.gov.ph | — | — | Confirm employee vs self-employed TIN routes and the online system name |
| dfa-passport | Department of Foreign Affairs | https://consular.dfa.gov.ph | — | — | Confirm official appointment site and requirement lists |
| nbi-clearance | National Bureau of Investigation | https://clearance.nbi.gov.ph | — | — | Confirm online application flow |
| psa-civil-registry | Philippine Statistics Authority | https://psa.gov.ph | — | — | Confirm official request channels |
| national-id | PSA — PhilSys | https://philsys.gov.ph | — | — | Confirm registration options and whether the ID has an expiry |
| lto-drivers-license | Land Transportation Office | https://lto.gov.ph | — | — | Confirm license types, renewal and online portal |

Document templates (`packages/shared/src/catalog.ts`) also link agency homepages; their "usually expires" defaults are
form hints the user can change, and should be reviewed against the same sources.

Before the Play listing is published, append the verified official URLs to the full description (see
`store/descriptions/en.md`) and remove any guide that remains unverified.
