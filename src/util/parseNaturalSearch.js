export const parseNaturalSearch = query => {
  const text = query.toLowerCase().trim();

  const result = {
    keywords: query,
  };

  // Price: under €10, below 10, less than €10, etc.
  const priceMatch = text.match(
    /(?:under|below|less than|max(?:imum)?(?: price)?(?: of)?)\s*€?\s*(\d+(?:[.,]\d+)?)/
  );

  if (priceMatch) {
    result.maxPrice = Number(priceMatch[1].replace(',', '.'));
  }

  // Kids intent
  if (/\b(kid|kids|child|children)\b/.test(text)) {
    result.kids = true;
  }

  // Product categories
  const categoryMap = [
    { words: ['shoes', 'shoe'], keyword: 'shoes' },
    { words: ['boots', 'boot'], keyword: 'boots' },
    { words: ['dresses', 'dress'], keyword: 'dress' },
    { words: ['jackets', 'jacket'], keyword: 'jacket' },
    { words: ['shirts', 'shirt'], keyword: 'shirt' },
    { words: ['pants'], keyword: 'pants' },
    { words: ['jeans'], keyword: 'jeans' },
    { words: ['sweaters', 'sweater'], keyword: 'sweater' },
    { words: ['bags', 'bag'], keyword: 'bag' },
  ];

  const matchedCategory = categoryMap.find(({ words }) =>
    words.some(word => text.includes(word))
  );

  if (matchedCategory) {
    result.categoryKeyword = matchedCategory.keyword;

    // Real category tree from the app:
    // Kids -> Shoes = kids / kids-shoes
    if (result.kids && matchedCategory.keyword === 'shoes') {
      result.categoryLevel1 = 'kids';
      result.categoryLevel2 = 'kids-shoes';
    }
  }

  // Keep only useful search keywords.
  const keywordParts = [];

  if (result.categoryKeyword) {
    keywordParts.push(result.categoryKeyword);
  }

  if (result.kids) {
    keywordParts.push('kids');
  }

  result.keywords = keywordParts.length > 0
    ? keywordParts.join(' ')
    : query;

  return result;
};
