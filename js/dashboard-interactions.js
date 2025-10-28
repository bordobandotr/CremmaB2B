document.addEventListener('DOMContentLoaded', () => {

    // Onay bekleyen transfer kartı sayısını kontrol et
    const approvalCard = document.querySelector('.approval-card');
    if (approvalCard) {
        const approvalCount = approvalCard.querySelector('.approval-count');
        if (approvalCount && approvalCount.textContent.trim() === '0') {
            approvalCard.classList.add('zero-approvals');
        }
    }

    // Yeni Ticket Formu Etkileşimleri
    const newTicketCard = document.getElementById('new-ticket-card');
    if (newTicketCard) {
        // Öncelik butonları
        const priorityButtons = newTicketCard.querySelectorAll('.priority-btn');
        priorityButtons.forEach(button => {
            button.addEventListener('click', () => {
                priorityButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
            });
        });

        // Dosya yükleme metni
        const fileUploadInput = newTicketCard.querySelector('#file-upload');
        const fileUploadText = newTicketCard.querySelector('.file-upload-text');
        if (fileUploadInput && fileUploadText) {
            fileUploadInput.addEventListener('change', () => {
                if (fileUploadInput.files.length > 0) {
                    fileUploadText.textContent = fileUploadInput.files[0].name;
                } else {
                    fileUploadText.textContent = 'Dosya seçilmedi';
                }
            });
        }
    }
});
