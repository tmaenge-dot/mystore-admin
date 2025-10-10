const products = {
  choppies: [
    { id: 'p1', name: 'Apple', price: 2.0, image: '/images/apple.svg', category: 'Produce' },
    { id: 'p2', name: 'Milk', price: 3.1, image: '/images/milk.svg', category: 'Dairy' },
    { id: 'p3', name: 'Broccoli', price: 2.4, image: '', category: 'Produce' }
  ],
  thuso: [
    {
      id: 't1',
      name: 'Bulk Rice 10kg',
      price: 25.0,
      image: '/images/thuso-rice.svg',
      category: 'Grains',
      description: 'Commercial grade long-grain rice, packed in 10kg sacks for wholesale buyers.',
      bulkPricing: [
        { minQty: 5, price: 23.0 },
        { minQty: 10, price: 20.0 }
      ]
    },
    {
      id: 't2',
      name: 'Cooking Oil 5L',
      price: 18.5,
      image: '/images/thuso-oil.svg',
      category: 'Oils',
      description: 'Refined cooking oil sold in 5L bottles, ideal for catering and small retailers.',
      bulkPricing: [
        { minQty: 6, price: 17.0 },
        { minQty: 12, price: 15.5 }
      ]
    },
    {
      id: 't3',
      name: 'Sugar 10kg',
      price: 12.0,
      image: '/images/thuso-sugar.svg',
      category: 'Baking',
      description: 'Granulated sugar packed in 10kg bags for bakeries and stores.',
      bulkPricing: [
        { minQty: 4, price: 11.0 },
        { minQty: 10, price: 9.5 }
      ]
    }
  ],
  woolworths: [
    { id: 'w1', name: 'Bananas', price: 1.6, image: '', category: 'Produce' },
    { id: 'w2', name: 'Yogurt', price: 1.9, image: '', category: 'Dairy' }
  ]
};

export default products;
