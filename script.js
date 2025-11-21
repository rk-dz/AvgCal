document.addEventListener('DOMContentLoaded', () => {
    // --- إعدادات وحالة التطبيق (هيكل البيانات الجديد) ---
    const appState = {
        currentSemesterId: null,
        editingIndex: null,
        semesterData: [
            { id: 1, name: 'الفصل الأول', subjects: [] },
            { id: 2, name: 'الفصل الثاني', subjects: [] },
            { id: 3, name: 'الفصل الثالث', subjects: [] }
        ]
    };

    // --- عناصر DOM ---
    const elements = {
        appContainer: document.querySelector('.app-container'),
        semesterSelect: document.getElementById('semester-select'),
        subjectInputForm: document.getElementById('subject-input-form'),
        subjectsListSection: document.getElementById('subjects-list-section'),
        subjectName: document.getElementById('subject-name'),
        subjectCoefficient: document.getElementById('subject-coefficient'),
        assignmentGrade: document.getElementById('assignment-grade'),
        examGrade: document.getElementById('exam-grade'),
        finalGrade: document.getElementById('final-grade'),
        addSubjectBtn: document.getElementById('add-subject-btn'),
        formTitle: document.getElementById('form-title'),
        formButtonText: document.getElementById('form-button-text'),
        clearDataBtn: document.getElementById('clear-data-btn'),
        subjectsList: document.getElementById('subjects-list'),
        semesterAverage: document.getElementById('semester-average'),
        gradeEvaluation: document.getElementById('grade-evaluation'),
        annualAverage: document.getElementById('annual-average'),
        chartCanvas: document.getElementById('performance-chart'),
        notificationContainer: document.getElementById('notification-container')
    };

    let performanceChart = null;

    // --- دوال مساعدة ---
    function getCurrentSemester() {
        return appState.semesterData.find(s => s.id == appState.currentSemesterId);
    }

    // --- دوال التخزين القوي ---
    function saveToLocalStorage() {
        try {
            localStorage.setItem('currentSemesterId', appState.currentSemesterId);
            localStorage.setItem('semesterData', JSON.stringify(appState.semesterData));
        } catch (e) {
            console.error("Failed to save state to localStorage:", e);
            showNotification('فشل حفظ البيانات.', 'error');
        }
    }

    function loadFromLocalStorage() {
        try {
            const savedSemesterId = localStorage.getItem('currentSemesterId');
            appState.currentSemesterId = savedSemesterId ? parseInt(savedSemesterId, 10) : null;

            const savedData = localStorage.getItem('semesterData');
            if (savedData) {
                appState.semesterData = JSON.parse(savedData);
            }
        } catch (e) {
            console.error("Failed to load state from localStorage, resetting:", e);
            showNotification('تم إعادة تعيين البيانات بسبب خطأ في التحميل.', 'warning');
            appState.currentSemesterId = null;
            appState.semesterData = [
                { id: 1, name: 'الفصل الأول', subjects: [] },
                { id: 2, name: 'الفصل الثاني', subjects: [] },
                { id: 3, name: 'الفصل الثالث', subjects: [] }
            ];
        }
    }

    function clearAllData() {
        if (confirm('هل أنت متأكد من أنك تريد مسح جميع البيانات؟ لا يمكن التراجع عن هذا الإجراء.')) {
            try {
                localStorage.clear();
                showNotification('تم مسح جميع البيانات بنجاح. سيتم إعادة تحميل الصفحة.', 'success');
                setTimeout(() => location.reload(), 1500);
            } catch (e) {
                console.error("Failed to clear localStorage:", e);
                showNotification('فشل مسح البيانات.', 'error');
            }
        }
    }

    // --- دوال التحكم الرئيسية ---
    function switchSemester(semesterId) {
        if (!semesterId) {
            appState.currentSemesterId = null;
        } else {
            appState.currentSemesterId = parseInt(semesterId, 10);
        }
        
        resetForm();
        updateSubjectsList();
        updateResults(); // لا حاجة لتمرير قيمة هنا
        updateChart();
        updateUIVisibility();
        checkFormValidity();
        saveToLocalStorage();
    }

    function addOrUpdateSubject() {
        const currentSemester = getCurrentSemester();
        if (!currentSemester) {
            showNotification('الرجاء اختيار الفصل الدراسي أولاً.', 'warning');
            return;
        }

        // --- الإصلاح: حساب المعدل القديم قبل تعديل البيانات ---
        const { average: oldAverage } = calculateSemesterAverage(currentSemester.subjects);

        const subjectData = getSubjectFromForm(true);
        if (!subjectData) return;

        if (appState.editingIndex !== null) {
            const originalName = currentSemester.subjects[appState.editingIndex].name;
            currentSemester.subjects[appState.editingIndex] = { ...subjectData, name: originalName };
            showNotification(`تم تحديث مادة ${originalName} بنجاح.`, 'success');
        } else {
            if (currentSemester.subjects.some(s => s.name === subjectData.name)) {
                showNotification('هذه المادة مضافة بالفعل.', 'error');
                return;
            }
            currentSemester.subjects.push(subjectData);
            showNotification(`تمت إضافة مادة ${subjectData.name} بنجاح.`, 'success');
        }

        resetForm();
        updateSubjectsList();
        // --- الإصلاح: تمرير المعدل القديم الصحيح ---
        updateResults(oldAverage);
        updateChart();
        updateUIVisibility();
        checkFormValidity();
        saveToLocalStorage();
    }

    function editSubject(index) {
        const currentSemester = getCurrentSemester();
        if (!currentSemester || !currentSemester.subjects[index]) return;

        const subject = currentSemester.subjects[index];
        elements.subjectName.value = subject.name;
        elements.subjectCoefficient.value = subject.coefficient;
        elements.assignmentGrade.value = subject.assignment;
        elements.examGrade.value = subject.exam;
        elements.finalGrade.value = subject.final;

        appState.editingIndex = index;
        elements.formTitle.textContent = 'تعديل مادة';
        elements.formButtonText.textContent = 'تحديث المادة';
        elements.addSubjectBtn.style.background = 'linear-gradient(45deg, var(--warning-color), var(--warning-hover))';

        elements.subjectName.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function deleteSubject(index) {
        const currentSemester = getCurrentSemester();
        if (!currentSemester) return;
        
        const subjectName = currentSemester.subjects[index].name;
        if (confirm(`هل أنت متأكد من حذف مادة "${subjectName}"؟`)) {
            currentSemester.subjects.splice(index, 1);
            updateSubjectsList();
            updateResults(); // لا حاجة لتمرير قيمة هنا
            updateChart();
            updateUIVisibility();
            checkFormValidity();
            saveToLocalStorage();
            showNotification(`تم حذف مادة ${subjectName}.`, 'success');
        }
    }

    // --- دوال تحديث الواجهة ---
    function updateUIVisibility() {
        const isSemesterSelected = !!appState.currentSemesterId;
        const currentSemester = getCurrentSemester();
        const hasSubjects = currentSemester && currentSemester.subjects.length > 0;

        if (isSemesterSelected) {
            elements.subjectInputForm.classList.remove('hidden', 'disabled-form');
            elements.subjectInputForm.classList.add('visible');
        } else {
            elements.subjectInputForm.classList.add('hidden', 'disabled-form');
            elements.subjectInputForm.classList.remove('visible');
        }

        if (hasSubjects) {
            elements.subjectsListSection.classList.remove('hidden');
            elements.subjectsListSection.classList.add('visible');
        } else {
            elements.subjectsListSection.classList.add('hidden');
            elements.subjectsListSection.classList.remove('visible');
        }
    }

    function updateSubjectsList() {
        const currentSemester = getCurrentSemester();
        const subjects = currentSemester ? currentSemester.subjects : [];
        elements.subjectsList.innerHTML = '';

        subjects.forEach((subject, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div class="subject-info">
                    <strong class="subject-info-text">${subject.name}</strong> (معامل: ${subject.coefficient})
                    <br>
                    <span>المعدل: ${subject.finalGrade.toFixed(2)}/20</span>
                </div>
                <div class="subject-actions">
                    <button class="edit-btn" data-index="${index}" title="تعديل">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="delete-btn" data-index="${index}" title="حذف">
                         <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </div>
            `;
            elements.subjectsList.appendChild(li);
        });
    }

    // --- الإصلاح: تعديل دالة updateResults لقبول المعدل القديم ---
    function updateResults(oldAverage = null) {
        const currentSemester = getCurrentSemester();
        const subjects = currentSemester ? currentSemester.subjects : [];
        const { average, evaluation } = calculateSemesterAverage(subjects);
        
        // إذا لم يتم تمرير معدل قديم، احصل عليه من العنصر (للحالات الأولية)
        const startValue = oldAverage !== null ? oldAverage : (parseFloat(elements.semesterAverage.textContent) || 0);
        
        animateValue(elements.semesterAverage, startValue, average, 500);
        elements.gradeEvaluation.textContent = evaluation;
        
        calculateAnnualAverage();
    }

    function updateChart() {
        const currentSemester = getCurrentSemester();
        const subjects = currentSemester ? currentSemester.subjects : [];
        const ctx = elements.chartCanvas.getContext('2d');

        if (performanceChart) {
            performanceChart.destroy();
        }

        performanceChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: subjects.map(s => s.name),
                datasets: [{
                    label: 'الدرجة النهائية',
                    data: subjects.map(s => s.finalGrade),
                    backgroundColor: 'rgba(76, 201, 240, 0.5)',
                    borderColor: 'rgba(76, 201, 240, 1)',
                    borderWidth: 2,
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, max: 20, grid: { color: 'rgba(255, 255, 255, 0.1)' }, ticks: { color: '#a8b2d1' } },
                    x: { grid: { display: false }, ticks: { color: '#a8b2d1' } }
                },
                plugins: { legend: { display: false } }
            }
        });
    }

    // --- دوال الحسابات ---
    function calculateSemesterAverage(subjects) {
        if (subjects.length === 0) return { average: 0, evaluation: 'لا توجد مواد' };
        const totalWeightedGrade = subjects.reduce((sum, sub) => sum + (sub.finalGrade * sub.coefficient), 0);
        const totalCoefficient = subjects.reduce((sum, sub) => sum + sub.coefficient, 0);
        const average = totalWeightedGrade / totalCoefficient;
        return { average, evaluation: getGradeEvaluation(average) };
    }

    function calculateAnnualAverage() {
        let totalAverage = 0;
        appState.semesterData.forEach(semester => {
            const { average } = calculateSemesterAverage(semester.subjects);
            totalAverage += average;
        });

        const annualAvg = totalAverage / 3;
        const oldAnnualAverage = parseFloat(elements.annualAverage.textContent) || 0;
        animateValue(elements.annualAverage, oldAnnualAverage, annualAvg, 500);

        const semestersWithDataCount = appState.semesterData.filter(s => s.subjects.length > 0).length;
        if (semestersWithDataCount === 3) {
            elements.annualAverage.classList.remove('disabled');
        } else {
            elements.annualAverage.classList.add('disabled');
        }
    }

    function getGradeEvaluation(average) {
        if (average >= 18) return "ممتاز";
        if (average >= 16) return "جيد جداً";
        if (average >= 14) return "جيد";
        if (average >= 12) return "مقبول";
        if (average >= 10) return "موسوس";
        return "ضعيف";
    }

    // --- دوال مساعدة ---
    function getSubjectFromForm(showErrors = false) {
        const name = elements.subjectName.value.trim();
        const coefficient = parseInt(elements.subjectCoefficient.value);
        const assignment = parseFloat(elements.assignmentGrade.value);
        const exam = parseFloat(elements.examGrade.value);
        const final = parseFloat(elements.finalGrade.value);

        if (!name || isNaN(coefficient) || isNaN(assignment) || isNaN(exam) || isNaN(final)) {
            if (showErrors) showNotification('الرجاء ملء جميع الحقول.', 'error');
            return null;
        }
        if (assignment > 20 || exam > 20 || final > 20) {
            if (showErrors) showNotification('الدرجات لا يمكن أن تتجاوز 20.', 'error');
            return null;
        }
        if (coefficient > 5) {
            if (showErrors) showNotification('المعامل لا يمكن أن يتجاوز 5.', 'error');
            return null;
        }
        
        const finalGrade = ((assignment + exam) / 2 + (final * 2)) / 3;
        return { name, coefficient, assignment, exam, final, finalGrade };
    }
    
    function resetForm() {
        elements.subjectName.value = '';
        elements.subjectCoefficient.value = '';
        elements.assignmentGrade.value = '';
        elements.examGrade.value = '';
        elements.finalGrade.value = '';
        
        appState.editingIndex = null;
        elements.formTitle.textContent = 'إضافة مادة';
        elements.formButtonText.textContent = 'إضافة المادة';
        elements.addSubjectBtn.style.background = '';
        
        checkFormValidity();
    }

    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        elements.notificationContainer.appendChild(notification);
        
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });

        setTimeout(() => {
            notification.classList.add('hide');
            setTimeout(() => {
                notification.remove();
            }, 600);
        }, 3000);
    }

    function animateValue(element, start, end, duration) {
        const range = end - start;
        const increment = range / (duration / 16);
        let current = start;
        const timer = setInterval(() => {
            current += increment;
            if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
                element.textContent = end.toFixed(2);
                clearInterval(timer);
            } else {
                element.textContent = current.toFixed(2);
            }
        }, 16);
    }

    // --- دالة مساعدة للتحديث الفوري (المصححة) ---
    function updateResultsPreview() {
        const currentSemester = getCurrentSemester();
        if (!currentSemester) return;

        const isFormFilled = elements.subjectName.value.trim() !== '' &&
                             elements.subjectCoefficient.value !== '' &&
                             elements.assignmentGrade.value !== '' &&
                             elements.examGrade.value !== '' &&
                             elements.finalGrade.value !== '';

        if (!isFormFilled) {
            return;
        }

        const newSubjectData = getSubjectFromForm(false);
        if (!newSubjectData) {
            return;
        }

        let previewSubjects = [...currentSemester.subjects];

        if (appState.editingIndex !== null) {
            const originalName = currentSemester.subjects[appState.editingIndex].name;
            previewSubjects[appState.editingIndex] = { ...newSubjectData, name: originalName };
        } else {
            if (currentSemester.subjects.some(s => s.name === newSubjectData.name)) return;
            previewSubjects.push(newSubjectData);
        }

        const { average, evaluation } = calculateSemesterAverage(previewSubjects);
        // في المعاينة، نحدث القيمة مباشرة بدون رسوم متحركة
        elements.semesterAverage.textContent = average.toFixed(2);
        elements.gradeEvaluation.textContent = evaluation;
    }

    function checkFormValidity() {
        const isSemesterSelected = !!appState.currentSemesterId;
        const coefficient = parseInt(elements.subjectCoefficient.value);
        const isCoefficientValid = !isNaN(coefficient) && coefficient > 0 && coefficient <= 5;

        const isFormComplete = elements.subjectName.value.trim() !== '' &&
                                isCoefficientValid &&
                                elements.assignmentGrade.value !== '' &&
                                elements.examGrade.value !== '' &&
                                elements.finalGrade.value !== '';

        if (isSemesterSelected && isFormComplete) {
            elements.addSubjectBtn.disabled = false;
        } else {
            elements.addSubjectBtn.disabled = true;
        }
    }

    // --- ربط الأحداث والبدء ---
    elements.addSubjectBtn.addEventListener('click', addOrUpdateSubject);

    elements.semesterSelect.addEventListener('change', (e) => {
        switchSemester(e.target.value);
    });

    elements.clearDataBtn.addEventListener('click', clearAllData);
    
    elements.subjectsList.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        const index = parseInt(btn.dataset.index, 10);
        if (btn.classList.contains('delete-btn')) {
            deleteSubject(index);
        } else if (btn.classList.contains('edit-btn')) {
            editSubject(index);
        }
    });

    elements.subjectInputForm.addEventListener('input', () => {
        checkFormValidity();
        updateResultsPreview();
    });

    // Load data and initialize
    loadFromLocalStorage();
    if (appState.currentSemesterId) {
        elements.semesterSelect.value = appState.currentSemesterId;
    }
    switchSemester(appState.currentSemesterId);
    checkFormValidity();
});
