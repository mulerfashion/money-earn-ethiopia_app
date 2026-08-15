async function rejectDeposit(id) {
  
  try {
    
    const depositRef = doc(db, "deposits", id);
    const depositSnap = await getDoc(depositRef);
    
    if (!depositSnap.exists()) {
      alert("❌ Deposit not found.");
      return;
    }
    
    const deposit = depositSnap.data();
    
    if (deposit.status !== "Pending") {
      alert("⚠️ This deposit has already been processed.");
      return;
    }
    
    // Update deposit status
    await updateDoc(depositRef, {
      status: "Rejected",
      rejectedAt: serverTimestamp()
    });
    
    // Save transaction
    await addDoc(collection(db, "transactions"), {
      userId: deposit.userId,
      type: "Deposit Rejected",
      amount: Number(deposit.amount),
      status: "Rejected",
      description: "Deposit rejected by Admin",
      createdAt: serverTimestamp()
    });
    
    alert("✅ Deposit Rejected Successfully.");
    
    await loadDashboard();
    
  } catch (error) {
    
    console.error(error);
    
    alert("❌ " + error.message);
    
  }
  
}