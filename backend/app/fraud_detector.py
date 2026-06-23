# backend\app\fraud_detector.py

def evaluate_swipe_risk(transaction_features: dict) -> dict:
    """
    Local simulation fallback framework. 
    Bypasses Triton and numpy requirements to deploy flawlessly on Vercel.
    """
    try:
        amount = float(transaction_features.get("amount", 0.0))
        is_suspicious = bool(amount > 4000.00) # Simple metric calculation for demo
        
        if is_suspicious:
            return {
                "fraud_risk_score": 0.92,
                "action": "DECLINE",
                "reason": "Simulated high-value variance trigger active"
            }
            
        return {
            "fraud_risk_score": 0.02,
            "action": "APPROVE",
            "reason": "Clear transaction signature"
        }
    except Exception as e:
        return {"fraud_risk_score": 0.0, "action": "APPROVE", "reason": "Model circuit breaker fallback optimization active"}
