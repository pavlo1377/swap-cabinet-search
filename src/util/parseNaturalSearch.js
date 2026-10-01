export const parseNaturalSearch = query => {
  const text = query.toLowerCase().trim();

  const result = {
    keywords: query,
  };

  // Price: "under €10", "under 10", "less than €10", etc.
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

  // Common product/category words
  const categoryWords = [
    'shoes',
    'shoe',
    'boots',
    'dress',
    'dresses',
    'jacket',
    'jackets',
    'shirt',
    'shirts',
    'pants',
    'jeans',
    'sweater',
    'sweaters',
    'bag',
    'bags',
  ];

  const category = categoryWords.find(word => text.includes(word));

  if (category) {
    result.categoryKeyword = category;
    if (result.kids && (category === 'shoes' || category === 'shoe')) {
      result.categoryLevel1 = 'kids';
      result.categoryLevel2 = 'kids-shoes';
    }
  }

  const keywordParts = [];
  if (category) keywordParts.push(category);
  if (result.kids) keywordParts.push('kids');
  result.keywords = keywordParts.length > 0 ? keywordParts.join(' ') : query;

  return result;
};
