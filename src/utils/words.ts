import quotes from "popular-movie-quotes";

export function generate(count = 5) {
  const result: any = [];
  for (let i = 0; i < count; i++) {
    let quote: string = quotes.getRandomQuote();
    // remove all dots
    // quote = quote.replace(/\./g, "");
    result.push(quote);
  }

  return result.join(" ");
}
