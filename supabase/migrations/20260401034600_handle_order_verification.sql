
-- 20260401034600_handle_order_verification.sql
-- Atomic RPC for online order verification and stock reduction

CREATE OR REPLACE FUNCTION public.handle_order_verification(
    p_transaction_id UUID,
    p_outlet_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_item RECORD;
    v_bundle_item JSONB;
    v_current_stock INTEGER;
    v_product_name TEXT;
    v_required_quantity INTEGER;
    v_stock_id UUID;
BEGIN
    -- 1. Loop through all items in the transaction
    FOR v_item IN 
        SELECT ti.product_id, ti.quantity, p.name as product_name, p.is_bundle, p.bundle_items 
        FROM transaction_items ti 
        JOIN products p ON ti.product_id = p.id 
        WHERE ti.transaction_id = p_transaction_id
    LOOP
        
        IF v_item.is_bundle AND v_item.bundle_items IS NOT NULL AND jsonb_array_length(v_item.bundle_items) > 0 THEN
            -- Handle Bundle
            FOR v_bundle_item IN SELECT * FROM jsonb_array_elements(v_item.bundle_items) 
            LOOP
                v_required_quantity := (v_bundle_item->>'quantity')::INTEGER * v_item.quantity;
                
                -- Check Stock for component
                SELECT id, quantity INTO v_stock_id, v_current_stock 
                FROM stocks 
                WHERE product_id = (v_bundle_item->>'productId')::UUID 
                AND outlet_id = p_outlet_id;

                IF v_current_stock IS NULL OR v_current_stock < v_required_quantity THEN
                    RAISE EXCEPTION 'Stok tidak mencukupi untuk komponen bundle dari produk: %', v_item.product_name;
                END IF;

                -- Reduce Stock
                UPDATE stocks SET quantity = quantity - v_required_quantity 
                WHERE id = v_stock_id;
            END FOR;
        ELSE
            -- Handle Normal Product
            SELECT id, quantity INTO v_stock_id, v_current_stock 
            FROM stocks 
            WHERE product_id = v_item.product_id 
            AND outlet_id = p_outlet_id;

            IF v_current_stock IS NULL OR v_current_stock < v_item.quantity THEN
                RAISE EXCEPTION 'Stok tidak mencukupi untuk produk: % (Butuh: %, Ada: %)', v_item.product_name, v_item.quantity, COALESCE(v_current_stock, 0);
            END IF;

            -- Reduce Stock
            UPDATE stocks SET quantity = quantity - v_item.quantity 
            WHERE id = v_stock_id;
        END IF;
    END LOOP;

    -- 2. Update Transaction Status
    UPDATE transactions SET status = 'verified' WHERE id = p_transaction_id;

    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    -- Postgres will automatically rollback the transaction if an EXCEPTION is raised
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
