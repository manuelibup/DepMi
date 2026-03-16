SELECT 'Users' as table_name, count(*) as count FROM "User"
UNION ALL
SELECT 'Stores', count(*) FROM "Store"
UNION ALL
SELECT 'Products', count(*) FROM "Product"
UNION ALL
SELECT 'Demands', count(*) FROM "Demand"
UNION ALL
SELECT 'Orders', count(*) FROM "Order"
UNION ALL
SELECT 'Delivered/Completed Orders', count(*) FROM "Order" WHERE "status" IN ('DELIVERED', 'COMPLETED');
