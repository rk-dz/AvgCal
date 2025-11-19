let subjects = [];
let semester = '';
const semesterData = {}; // كائن لتخزين بيانات كل فصل

// الحصول على عنصر الفصل الدراسي مرة واحدة
const semesterSelect = document.getElementById('semester');

// حدث لتغيير الفصل الدراسي وتحديث المتغير `semester`
semesterSelect.addEventListener('change', function() {
    // حفظ بيانات الفصل الحالي
    if (semester) {
        semesterData[semester] = [...subjects];
    }
    
    // تحديث الفصل الدراسي
    semester = this.value;
    this.style.borderColor = ''; // إزالة التحديد الأحمر إذا تم اختيار الفصل الدراسي
    
    // تحميل بيانات الفصل الجديد إذا كانت موجودة
    subjects = semesterData[semester] || [];
    
    // تحديث الواجهة
    updateSubjectsList();
    calculateAverage();
    updateChart();

    // حساب وعرض المعدل السنوي عند اختيار الفصل الثالث
    if (semester === '3') {
        calculateAnnualAverage();
    }
});

// تحديث قائمة المواد على واجهة المستخدم
function updateSubjectsList() {
    const subjectsList = document.getElementById('subjects');
    subjectsList.innerHTML = '';

    subjects.forEach((subject) => {
        const li = document.createElement('li');
        li.textContent = `${subject.name}: ${subject.finalGrade} (معامل: ${subject.coefficient})`;
        subjectsList.appendChild(li);
    });
}

// حساب المعدل الفصلي
function calculateAverage() {
    let totalGrade = 0;
    let totalCoefficient = 0;
    subjects.forEach((subject) => {
        totalGrade += parseFloat(subject.finalGrade) * subject.coefficient;
        totalCoefficient += subject.coefficient;
    });
    const semesterAverage = totalCoefficient ? (totalGrade / totalCoefficient).toFixed(2) : '0.00';
    document.getElementById('semester-average').textContent = semesterAverage;
    document.getElementById('grade-evaluation').textContent = getGradeEvaluation(semesterAverage);
}

// تقييم الدرجات بناءً على المعدل
function getGradeEvaluation(average) {
    if (average >= 18) return "ممتاز";
    else if (average >= 15) return "جيد جدًا";
    else if (average >= 12) return "جيد";
    else if (average >= 10) return "مقبول";
    else if (average >= 8) return "قابل للتحسن";
    else return "ضعيف";
}

// تحديث الرسم البياني
function updateChart() {
    const ctx = document.getElementById('performanceChart').getContext('2d');
    const labels = subjects.map(sub => sub.name);
    const data = subjects.map(sub => parseFloat(sub.finalGrade));

    if (window.performanceChart instanceof Chart) {
        window.performanceChart.destroy();
    }

    window.performanceChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'العلامات',
                data: data,
                backgroundColor: 'rgba(98, 0, 238, 0.6)',
                borderColor: 'rgba(98, 0, 238, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    max: 20
                }
            }
        }
    });
}

// إضافة مادة مع حساب الفرض والتقويم والاختبار بالطريقة الجزائرية
function addSubject() {
    if (!semester) {
        alert('يرجى اختيار الفصل الدراسي أولاً.');
        semesterSelect.style.borderColor = 'red'; // تسليط الضوء على خانة الفصل الدراسي
        return;
    } else {
        semesterSelect.style.borderColor = ''; // إزالة الإضاءة عند التصحيح
    }

    const subjectName = document.getElementById('subject').value;
    const coefficientInput = document.getElementById('coefficient');
    const assignment1Input = document.getElementById('assignment1');
    const exam1Input = document.getElementById('exam1');
    const finalExamInput = document.getElementById('finalExam');

    if (!subjectName) {
        alert('يرجى اختيار المادة.');
        document.getElementById('subject').style.borderColor = 'red'; // تسليط الضوء على حقل المادة
        return;
    } else {
        document.getElementById('subject').style.borderColor = ''; // إزالة الإضاءة عند اختيار مادة صحيحة
    }
    
    const assignment1 = parseFloat(assignment1Input.value) || 0;
    const exam1 = parseFloat(exam1Input.value) || 0;
    const finalExam = parseFloat(finalExamInput.value) || 0;
    const coefficient = parseInt(coefficientInput.value, 10);

    let inputError = false;

    // التحقق من إدخال صحيح للمعامل
    if (isNaN(coefficient) || coefficient < 1 || coefficient > 5) {
        coefficientInput.style.borderColor = 'red';
        alert('يرجى إدخال معامل صحيح بين 1 و 5.');
        inputError = true;
    } else {
        coefficientInput.style.borderColor = '';
    }

    // التحقق من الدرجات
    if (assignment1 < 0 || assignment1 > 20) {
        assignment1Input.style.borderColor = 'red';
        alert('يرجى إدخال علامة الفرض بين 0 و 20.');
        inputError = true;
    } else {
        assignment1Input.style.borderColor = '';
    }

    if (exam1 < 0 || exam1 > 20) {
        exam1Input.style.borderColor = 'red';
        alert('يرجى إدخال علامة التقويم بين 0 و 20.');
        inputError = true;
    } else {
        exam1Input.style.borderColor = '';
    }

    if (finalExam < 0 || finalExam > 20) {
        finalExamInput.style.borderColor = 'red';
        alert('يرجى إدخال علامة الاختبار النهائي بين 0 و 20.');
        inputError = true;
    } else {
        finalExamInput.style.borderColor = '';
    }

    if (inputError) return;

    // التحقق من عدم تكرار المادة
    const existingSubject = subjects.find(subject => subject.name === subjectName);
    if (existingSubject) {
        alert('لقد قمت بإضافة هذه المادة بالفعل. يرجى اختيار مادة أخرى.');
        return;
    }

    // حساب المعدل باستخدام الصيغة الجزائرية
    const finalGrade = ((assignment1 * 2) + (exam1 * 1) + (finalExam * 2)) / 5;
    subjects.push({ name: subjectName, coefficient: coefficient, finalGrade: finalGrade.toFixed(2) });

    coefficientInput.value = '';
    document.getElementById('subject').value = '';
    assignment1Input.value = '';
    exam1Input.value = '';
    finalExamInput.value = '';

    updateSubjectsList();
    calculateAverage();
    updateChart();
}

// حساب المعدل السنوي
function calculateAnnualAverage() {
    let totalAverage = 0;
    let count = 0;

    // حساب مجاميع المعدلات لكل فصل
    for (let i = 1; i <= 3; i++) {
        const semesterSubjects = semesterData[i];
        if (semesterSubjects) {
            const semesterTotal = semesterSubjects.reduce((sum, subject) => sum + parseFloat(subject.finalGrade) * subject.coefficient, 0);
            const totalCoefficients = semesterSubjects.reduce((sum, subject) => sum + subject.coefficient, 0);
            const semesterAverage = totalCoefficients ? (semesterTotal / totalCoefficients) : 0;
            totalAverage += semesterAverage;
            count++;
        }
    }

    // حساب المعدل السنوي
    const annualAverage = count ? (totalAverage / count).toFixed(2) : '0.00';
    document.getElementById('annual-average').textContent = annualAverage;
}

    // حساب المعدل السنوي
    const annualAverage = count ? (totalAverage / count).toFixed(2) : '0.00';
    document.getElementById('annual-average').textContent = annualAverage;
}
