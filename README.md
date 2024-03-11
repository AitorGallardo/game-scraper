# Game Scraper

Seed db with a list of games, scrape prices of this games.

## Next steps

### - [ ] Clean data  

The seeder has created 1500+ registers, some data is not correct. 

### - [X] New column with sanitized title

An extre column is needed with a slash like title to properly do the scraping with an standard title:
- Lower case -> Replace ':', ';', ' ' for '-' -> If to hypens in a row delete one ex: '--' to '-' 
- An slugh is what i actually needed
