// src/components/Admin/AdminRatings.jsx
import React, { useState, useEffect } from 'react';
import {
    Card, Table, Badge, Button, Modal,
    Alert, Spinner, Row, Col, Form, ButtonGroup, InputGroup
} from 'react-bootstrap';
import {
    FaStar,
    FaCalendarAlt,
    FaEye,
    FaFilter,
    FaDownload,
    FaChartBar,
    FaUserTie,
    FaInfoCircle,
    FaSyncAlt,
    FaUserCog,
    FaEdit,
    FaSave,
    FaTimes,
    FaCheckCircle,
    FaSearch
} from 'react-icons/fa';
import axios from '../../config/axios';
import API_ENDPOINTS from '../../config/api';
import * as XLSX from 'xlsx';

const AdminRatings = () => {
    const [ratings, setRatings] = useState([]);
    const [allEmployees, setAllEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRating, setSelectedRating] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
    const [filterYear, setFilterYear] = useState(new Date().getFullYear());
    const [filterEmployee, setFilterEmployee] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [message, setMessage] = useState({ type: '', text: '' });
    const [stats, setStats] = useState({
        total_ratings: 0,
        manager_ratings: 0,
        admin_ratings: 0,
        average_rating: 0,
        rating_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    });

    // Admin rating states - Table view instead of dropdown
    const [showAdminRatingModal, setShowAdminRatingModal] = useState(false);
    const [selectedEmployeeForAdmin, setSelectedEmployeeForAdmin] = useState(null);
    const [adminRating, setAdminRating] = useState(0);
    const [hoverAdminRating, setHoverAdminRating] = useState(0);
    const [adminComments, setAdminComments] = useState('');
    const [submittingAdminRating, setSubmittingAdminRating] = useState(false);
    const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
    const [employeeDepartmentFilter, setEmployeeDepartmentFilter] = useState('all');
    const [departments, setDepartments] = useState([]);

    const months = [
        { value: 1, label: 'January' }, { value: 2, label: 'February' },
        { value: 3, label: 'March' }, { value: 4, label: 'April' },
        { value: 5, label: 'May' }, { value: 6, label: 'June' },
        { value: 7, label: 'July' }, { value: 8, label: 'August' },
        { value: 9, label: 'September' }, { value: 10, label: 'October' },
        { value: 11, label: 'November' }, { value: 12, label: 'December' }
    ];

    const years = [];
    for (let i = 2023; i <= new Date().getFullYear(); i++) {
        years.push(i);
    }

    useEffect(() => {
        fetchEmployees();
        fetchRatings();
    }, [filterMonth, filterYear, filterEmployee, filterType]);

    const fetchEmployees = async () => {
        try {
            const response = await axios.get(API_ENDPOINTS.EMPLOYEES);
            setAllEmployees(response.data || []);
            const depts = ['all', ...new Set(response.data.map(emp => emp.department).filter(Boolean))];
            setDepartments(depts);
        } catch (error) {
            console.error('Error fetching employees:', error);
        }
    };

    const fetchRatings = async () => {
        try {
            setLoading(true);
            let url = `${API_ENDPOINTS.RATINGS}/all?month=${filterMonth}&year=${filterYear}`;
            if (filterEmployee) {
                url += `&employee_id=${filterEmployee}`;
            }
            if (filterType !== 'all') {
                url += `&rating_type=${filterType}`;
            }

            const response = await axios.get(url);
            if (response.data.success) {
                setRatings(response.data.ratings || []);
                calculateStats(response.data.ratings || []);
            }
        } catch (error) {
            console.error('Error fetching ratings:', error);
            setMessage({ type: 'danger', text: 'Failed to load ratings' });
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (ratingsData) => {
        const total = ratingsData.length;
        const managerCount = ratingsData.filter(r => r.rater_role === 'Manager').length;
        const adminCount = ratingsData.filter(r => r.rater_role === 'Admin').length;
        const sum = ratingsData.reduce((acc, r) => acc + r.rating, 0);
        const avg = total > 0 ? (sum / total).toFixed(1) : 0;

        const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        ratingsData.forEach(r => {
            distribution[r.rating] = (distribution[r.rating] || 0) + 1;
        });

        setStats({
            total_ratings: total,
            manager_ratings: managerCount,
            admin_ratings: adminCount,
            average_rating: avg,
            rating_distribution: distribution
        });
    };

    const getRatingLabel = (rating) => {
        if (rating === 5) return 'Excellent';
        if (rating === 4) return 'Good';
        if (rating === 3) return 'Average';
        if (rating === 2) return 'Below Average';
        if (rating === 1) return 'Poor';
        return 'Not Rated';
    };

    const getRatingColor = (rating) => {
        if (rating >= 4.5) return 'success';
        if (rating >= 3.5) return 'info';
        if (rating >= 2.5) return 'warning';
        return 'danger';
    };

    const renderStars = (rating, interactive = false, onStarClick, onStarHover, onHoverLeave) => {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            if (interactive) {
                stars.push(
                    <FaStar
                        key={i}
                        size={24}
                        className="me-1"
                        style={{
                            cursor: 'pointer',
                            color: (hoverAdminRating >= i || adminRating >= i) ? '#ffc107' : '#e4e5e9',
                            transition: 'all 0.2s ease'
                        }}
                        onClick={() => onStarClick(i)}
                        onMouseEnter={() => onStarHover(i)}
                        onMouseLeave={onHoverLeave}
                    />
                );
            } else {
                stars.push(
                    <FaStar
                        key={i}
                        size={14}
                        className="me-1"
                        style={{ color: i <= rating ? '#ffc107' : '#e4e5e9' }}
                    />
                );
            }
        }
        return stars;
    };

    const handleExportExcel = () => {
        try {
            const exportData = ratings.map(r => ({
                'Employee Name': r.employee_name,
                'Employee ID': r.employee_id,
                'Department': r.department,
                'Reporting Manager': r.reporting_manager,
                'Rating': `${r.rating} Star - ${getRatingLabel(r.rating)}`,
                'Rated By': r.rater_name,
                'Rated By Role': r.rater_role,
                'Comments': r.comments || '-',
                'Month': r.month_name,
                'Year': r.year,
                'Rated On': new Date(r.created_at).toLocaleDateString()
            }));

            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Employee Ratings');
            XLSX.writeFile(wb, `Employee_Ratings_${filterMonth}_${filterYear}.xlsx`);

            setMessage({ type: 'success', text: 'Report exported successfully!' });
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            console.error('Export error:', error);
            setMessage({ type: 'danger', text: 'Failed to export data' });
        }
    };

    const clearFilters = () => {
        setFilterMonth(new Date().getMonth() + 1);
        setFilterYear(new Date().getFullYear());
        setFilterEmployee('');
        setFilterType('all');
    };

    // Get current month and year for rating
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const monthName = new Date().toLocaleString('default', { month: 'long' });

    // Check if employee already has admin rating for current month
    const hasAdminRatingForCurrentMonth = (employeeId) => {
        return ratings.some(r => r.employee_id === employeeId && r.rater_role === 'Admin' && r.month === filterMonth && r.year === filterYear);
    };

    const handleOpenAdminRatingModal = (employee) => {
        // Reset form
        setSelectedEmployeeForAdmin(employee);
        setAdminRating(0);
        setHoverAdminRating(0);
        setAdminComments('');

        // Check if already rated this month
        const existingRating = ratings.find(r => r.employee_id === employee.employee_id && r.rater_role === 'Admin' && r.month === filterMonth && r.year === filterYear);
        if (existingRating) {
            setAdminRating(existingRating.rating);
            setAdminComments(existingRating.comments || '');
        }

        setShowAdminRatingModal(true);
    };

    const handleSubmitAdminRating = async () => {
        if (!selectedEmployeeForAdmin) {
            setMessage({ type: 'warning', text: 'No employee selected' });
            return;
        }
        if (adminRating === 0) {
            setMessage({ type: 'warning', text: 'Please select a rating' });
            return;
        }

        setSubmittingAdminRating(true);
        try {
            // Always use admin-rate endpoint - it handles both insert and update
            const response = await axios.post(`${API_ENDPOINTS.RATINGS}/admin-rate`, {
                employee_id: selectedEmployeeForAdmin.employee_id,
                rating: adminRating,
                comments: adminComments,
                rating_month: filterMonth,
                rating_year: filterYear
            });

            if (response.data.success) {
                setMessage({ type: 'success', text: response.data.message });
                setShowAdminRatingModal(false);
                setSelectedEmployeeForAdmin(null);
                setAdminRating(0);
                setAdminComments('');
                await fetchRatings();
                await fetchEmployees();
                setTimeout(() => setMessage({ type: '', text: '' }), 3000);
            }
        } catch (error) {
            console.error('Error submitting admin rating:', error);
            setMessage({
                type: 'danger',
                text: error.response?.data?.message || 'Failed to submit rating'
            });
        } finally {
            setSubmittingAdminRating(false);
        }
    };

    // In ratingController.js - Update adminRateEmployee function
    const adminRateEmployee = async (req, res) => {
        try {
            const { employee_id, rating, comments, rating_month, rating_year } = req.body;
            const adminId = req.user?.employeeId;
            const userRole = req.user?.role;

            if (userRole !== 'admin') {
                return res.status(403).json({ success: false, message: 'Only admins can use this endpoint' });
            }

            if (!employee_id || !rating || rating < 1 || rating > 5) {
                return res.status(400).json({ success: false, message: 'Valid rating (1-5) is required' });
            }

            const month = rating_month || new Date().getMonth() + 1;
            const year = rating_year || new Date().getFullYear();

            // Check if admin already rated this employee this month
            const { data: existingRating, error: checkError } = await supabase
                .from('employee_ratings')
                .select('id')
                .eq('employee_id', employee_id)
                .eq('rating_month', month)
                .eq('rating_year', year)
                .eq('rated_by_role', 'admin')
                .maybeSingle();

            let result;

            if (existingRating) {
                // Update existing rating
                const { data, error } = await supabase
                    .from('employee_ratings')
                    .update({
                        rating,
                        comments,
                        updated_at: new Date()
                    })
                    .eq('id', existingRating.id)
                    .select();

                if (error) throw error;
                result = data;
            } else {
                // Insert new rating
                const { data, error } = await supabase
                    .from('employee_ratings')
                    .insert([{
                        employee_id,
                        manager_id: adminId,
                        rating,
                        comments,
                        rating_month: month,
                        rating_year: year,
                        rated_by_role: 'admin'
                    }])
                    .select();

                if (error) throw error;
                result = data;
            }

            res.json({
                success: true,
                message: existingRating ? 'Admin rating updated successfully' : 'Admin rating submitted successfully',
                rating: result[0]
            });

        } catch (error) {
            console.error('Error submitting admin rating:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    };

    // Filter employees for the table
    const filteredEmployees = allEmployees.filter(emp => {
        if (employeeSearchTerm) {
            const search = employeeSearchTerm.toLowerCase();
            const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
            if (!fullName.includes(search) && !emp.employee_id.toLowerCase().includes(search)) {
                return false;
            }
        }
        if (employeeDepartmentFilter !== 'all' && emp.department !== employeeDepartmentFilter) {
            return false;
        }
        return true;
    });

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
                <Spinner animation="border" variant="primary" />
            </div>
        );
    }

    return (
        <div className="p-2 p-md-3 p-lg-4">
            {/* Header */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
                <div>
                    <h5 className="mb-1 d-flex align-items-center">
                        <FaStar className="me-2 text-warning" />
                        Employee Performance Ratings
                    </h5>
                    <p className="text-muted mb-0 small">
                        View and manage employee ratings from managers and admins
                    </p>
                </div>
                <div className="d-flex gap-2">
                    <Button variant="success" size="sm" onClick={handleExportExcel}>
                        <FaDownload className="me-1" size={12} /> Export Report
                    </Button>
                </div>
            </div>

            {message.text && (
                <Alert variant={message.type} dismissible onClose={() => setMessage({ type: '', text: '' })} className="mb-3">
                    {message.text}
                </Alert>
            )}

            {/* Stats Cards */}
            <Row className="mb-4 g-2 g-md-3">
                <Col xs={6} sm={3} md={3}>
                    <Card className="border-0 shadow-sm h-100">
                        <Card.Body className="p-2 p-md-3 text-center">
                            <FaChartBar className="text-primary mb-2" size={20} />
                            <h6 className="mb-0 fw-bold">{stats.total_ratings}</h6>
                            <small className="text-muted">Total Ratings</small>
                        </Card.Body>
                    </Card>
                </Col>
                <Col xs={6} sm={3} md={3}>
                    <Card className="border-0 shadow-sm h-100">
                        <Card.Body className="p-2 p-md-3 text-center">
                            <FaUserTie className="text-info mb-2" size={20} />
                            <h6 className="mb-0 fw-bold">{stats.manager_ratings}</h6>
                            <small className="text-muted">Manager Ratings</small>
                        </Card.Body>
                    </Card>
                </Col>
                <Col xs={6} sm={3} md={3}>
                    <Card className="border-0 shadow-sm h-100">
                        <Card.Body className="p-2 p-md-3 text-center">
                            <FaUserCog className="text-success mb-2" size={20} />
                            <h6 className="mb-0 fw-bold">{stats.admin_ratings}</h6>
                            <small className="text-muted">Admin Ratings</small>
                        </Card.Body>
                    </Card>
                </Col>
                <Col xs={6} sm={3} md={3}>
                    <Card className="border-0 shadow-sm h-100">
                        <Card.Body className="p-2 p-md-3 text-center">
                            <FaStar className="text-warning mb-2" size={20} />
                            <h6 className="mb-0 fw-bold">{stats.average_rating} ★</h6>
                            <small className="text-muted">Average Rating</small>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Rating Distribution */}
            <Card className="border-0 shadow-sm mb-3">
                <Card.Header className="bg-light py-2">
                    <h6 className="mb-0 small fw-semibold">
                        <FaChartBar className="me-2" />
                        Rating Distribution
                    </h6>
                </Card.Header>
                <Card.Body className="p-3">
                    <Row className="text-center">
                        {[1, 2, 3, 4, 5].map(star => (
                            <Col xs={6} sm={2.4} md={2.4} key={star}>
                                <div className="mb-2">{renderStars(star)}</div>
                                <Badge bg={getRatingColor(star)} pill>
                                    {stats.rating_distribution[star] || 0} Ratings
                                </Badge>
                            </Col>
                        ))}
                    </Row>
                </Card.Body>
            </Card>

            {/* Filters */}
            <Card className="border-0 shadow-sm mb-3">
                <Card.Body className="p-3">
                    <Row className="g-2 align-items-end">
                        <Col xs={6} md={2}>
                            <Form.Label className="small text-muted mb-1">Month</Form.Label>
                            <Form.Select
                                size="sm"
                                value={filterMonth}
                                onChange={(e) => setFilterMonth(parseInt(e.target.value))}
                            >
                                {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </Form.Select>
                        </Col>
                        <Col xs={6} md={2}>
                            <Form.Label className="small text-muted mb-1">Year</Form.Label>
                            <Form.Select
                                size="sm"
                                value={filterYear}
                                onChange={(e) => setFilterYear(parseInt(e.target.value))}
                            >
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </Form.Select>
                        </Col>
                        <Col xs={6} md={3}>
                            <Form.Label className="small text-muted mb-1">Rating Type</Form.Label>
                            <Form.Select
                                size="sm"
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                            >
                                <option value="all">All Ratings</option>
                                <option value="manager">Manager Ratings Only</option>
                                <option value="admin">Admin Ratings Only</option>
                            </Form.Select>
                        </Col>
                        <Col xs={12} md={3}>
                            <Form.Label className="small text-muted mb-1">Employee</Form.Label>
                            <Form.Select
                                size="sm"
                                value={filterEmployee}
                                onChange={(e) => setFilterEmployee(e.target.value)}
                            >
                                <option value="">All Employees</option>
                                {allEmployees.map(emp => (
                                    <option key={emp.employee_id} value={emp.employee_id}>
                                        {emp.first_name} {emp.last_name} ({emp.employee_id})
                                    </option>
                                ))}
                            </Form.Select>
                        </Col>
                        <Col xs={12} md={2}>
                            <Button variant="outline-secondary" size="sm" onClick={clearFilters} className="w-100">
                                <FaFilter className="me-1" size={12} /> Clear Filters
                            </Button>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {/* Admin Rating - Employee List Table */}
            <Card className="border-0 shadow-sm mb-3">
                <Card.Header className="bg-primary text-white py-2 d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <h6 className="mb-0 small fw-semibold">
                        <FaUserCog className="me-2" />
                        Rate Employees (Admin)
                    </h6>
                    <Badge bg="light" text="dark" pill>{filteredEmployees.length} Employees</Badge>
                </Card.Header>
                <Card.Body className="p-0">
                    <div className="p-3 bg-light border-bottom">
                        <Row className="g-2">
                            <Col xs={12} md={6}>
                                <InputGroup size="sm">
                                    <InputGroup.Text><FaSearch size={12} /></InputGroup.Text>
                                    <Form.Control
                                        placeholder="Search by name or ID..."
                                        value={employeeSearchTerm}
                                        onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                                    />
                                </InputGroup>
                            </Col>
                            <Col xs={12} md={4}>
                                <Form.Select
                                    size="sm"
                                    value={employeeDepartmentFilter}
                                    onChange={(e) => setEmployeeDepartmentFilter(e.target.value)}
                                >
                                    <option value="all">All Departments</option>
                                    {departments.filter(d => d !== 'all').map(dept => (
                                        <option key={dept} value={dept}>{dept}</option>
                                    ))}
                                </Form.Select>
                            </Col>
                            <Col xs={12} md={2}>
                                <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    onClick={() => {
                                        setEmployeeSearchTerm('');
                                        setEmployeeDepartmentFilter('all');
                                    }}
                                    className="w-100"
                                >
                                    Clear
                                </Button>
                            </Col>
                        </Row>
                    </div>
                    <div className="table-responsive" style={{ maxHeight: '400px', overflow: 'auto' }}>
                        <Table hover className="mb-0" size="sm">
                            <thead className="bg-light sticky-top">
                                <tr className="small">
                                    <th className="fw-normal">#</th>
                                    <th className="fw-normal">Employee</th>
                                    <th className="fw-normal d-none d-md-table-cell">Department</th>
                                    <th className="fw-normal d-none d-lg-table-cell">Designation</th>
                                    <th className="fw-normal text-center">Current Rating</th>
                                    <th className="fw-normal text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEmployees.length > 0 ? (
                                    filteredEmployees.map((employee, index) => {
                                        const hasRating = hasAdminRatingForCurrentMonth(employee.employee_id);
                                        const existingRating = ratings.find(r => r.employee_id === employee.employee_id && r.rater_role === 'Admin' && r.month === filterMonth && r.year === filterYear);

                                        return (
                                            <tr key={employee.employee_id}>
                                                <td className="small text-center">{index + 1}</td>
                                                <td className="small">
                                                    <div className="fw-semibold">{employee.first_name} {employee.last_name}</div>
                                                    <small className="text-muted">{employee.employee_id}</small>
                                                </td>
                                                <td className="small d-none d-md-table-cell">{employee.department || '-'}</td>
                                                <td className="small d-none d-lg-table-cell">{employee.designation || '-'}</td>
                                                <td className="text-center">
                                                    {hasRating && existingRating ? (
                                                        <div>
                                                            <div className="mb-1">
                                                                {renderStars(existingRating.rating)}
                                                            </div>
                                                            <Badge bg={getRatingColor(existingRating.rating)} pill className="mt-1">
                                                                {getRatingLabel(existingRating.rating)}
                                                            </Badge>
                                                        </div>
                                                    ) : (
                                                        <Badge bg="secondary" pill>Not Rated</Badge>
                                                    )}
                                                </td>
                                                <td className="text-center">
                                                    <Button
                                                        variant={hasRating ? 'outline-warning' : 'outline-primary'}
                                                        size="sm"
                                                        onClick={() => handleOpenAdminRatingModal(employee)}
                                                    >
                                                        {hasRating ? <><FaEdit className="me-1" /> Update</> : <><FaStar className="me-1" /> Rate Now</>}
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="text-center py-4">
                                            <FaUserCog size={40} className="text-muted mb-2 opacity-50" />
                                            <p className="text-muted mb-0">No employees found</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    </div>
                </Card.Body>
            </Card>

            {/* Ratings History Table */}
            <Card className="border-0 shadow-sm">
                <Card.Header className="bg-light py-2 d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <h6 className="mb-0 small fw-semibold">
                        <FaStar className="me-2 text-warning" />
                        Rating History - {months.find(m => m.value === filterMonth)?.label} {filterYear}
                    </h6>
                    <Badge bg="secondary" pill>{ratings.length} Records</Badge>
                </Card.Header>
                <Card.Body className="p-0">
                    <div className="table-responsive" style={{ maxHeight: '400px', overflow: 'auto' }}>
                        <Table hover className="mb-0" size="sm">
                            <thead className="bg-light sticky-top">
                                <tr className="small">
                                    <th className="fw-normal">#</th>
                                    <th className="fw-normal">Employee</th>
                                    <th className="fw-normal d-none d-md-table-cell">Department</th>
                                    <th className="fw-normal">Rating</th>
                                    <th className="fw-normal">Rated By</th>
                                    <th className="fw-normal d-none d-lg-table-cell">Comments</th>
                                    <th className="fw-normal text-center">Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ratings.length > 0 ? (
                                    ratings.map((rating, index) => (
                                        <tr key={rating.id}>
                                            <td className="small text-center">{index + 1}</td>
                                            <td className="small">
                                                <div className="fw-semibold">{rating.employee_name}</div>
                                                <small className="text-muted">{rating.employee_id}</small>
                                            </td>
                                            <td className="small d-none d-md-table-cell">{rating.department || '-'}</td>
                                            <td className="small">
                                                <div className="text-nowrap">{renderStars(rating.rating)}</div>
                                                <Badge bg={getRatingColor(rating.rating)} pill className="mt-1">
                                                    {getRatingLabel(rating.rating)}
                                                </Badge>
                                            </td>
                                            <td className="small">
                                                <div className="fw-semibold">{rating.rater_name}</div>
                                                <Badge bg={rating.rater_role === 'Admin' ? 'success' : 'info'} pill className="mt-1">
                                                    {rating.rater_role}
                                                </Badge>
                                            </td>
                                            <td className="small d-none d-lg-table-cell">
                                                <div className="text-truncate" style={{ maxWidth: '150px' }}>
                                                    {rating.comments || '-'}
                                                </div>
                                            </td>
                                            <td className="text-center">
                                                <Button
                                                    variant="outline-primary"
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedRating(rating);
                                                        setShowDetailsModal(true);
                                                    }}
                                                >
                                                    <FaEye size={12} />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="text-center py-4">
                                            <FaStar size={40} className="text-muted mb-2 opacity-50" />
                                            <p className="text-muted mb-0">No ratings found</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    </div>
                </Card.Body>
            </Card>

            {/* Admin Rating Modal */}
            <Modal show={showAdminRatingModal} onHide={() => setShowAdminRatingModal(false)} centered size="lg">
                <Modal.Header closeButton className="bg-primary text-white">
                    <Modal.Title className="h6">
                        <FaUserCog className="me-2" />
                        {selectedEmployeeForAdmin ? `Rate ${selectedEmployeeForAdmin.first_name} ${selectedEmployeeForAdmin.last_name}` : 'Rate Employee'} - {monthName} {filterYear}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    {selectedEmployeeForAdmin && (
                        <>
                            <div className="mb-4 p-3 bg-light rounded">
                                <Row className="g-3">
                                    <Col xs={12} md={6}>
                                        <div className="small text-muted">Employee ID</div>
                                        <div className="fw-semibold">{selectedEmployeeForAdmin.employee_id}</div>
                                    </Col>
                                    <Col xs={12} md={6}>
                                        <div className="small text-muted">Department</div>
                                        <div className="fw-semibold">{selectedEmployeeForAdmin.department || 'N/A'}</div>
                                    </Col>
                                    <Col xs={12}>
                                        <div className="small text-muted">Designation</div>
                                        <div className="fw-semibold">{selectedEmployeeForAdmin.designation || 'N/A'}</div>
                                    </Col>
                                </Row>
                            </div>

                            <Form.Group className="mb-4">
                                <Form.Label className="fw-semibold">Rating *</Form.Label>
                                <div className="d-flex align-items-center">
                                    {(() => {
                                        const stars = [];
                                        for (let i = 1; i <= 5; i++) {
                                            stars.push(
                                                <FaStar
                                                    key={i}
                                                    size={24}
                                                    className="me-1"
                                                    style={{
                                                        cursor: 'pointer',
                                                        color: (hoverAdminRating >= i || adminRating >= i) ? '#ffc107' : '#e4e5e9',
                                                        transition: 'all 0.2s ease'
                                                    }}
                                                    onClick={() => setAdminRating(i)}
                                                    onMouseEnter={() => setHoverAdminRating(i)}
                                                    onMouseLeave={() => setHoverAdminRating(0)}
                                                />
                                            );
                                        }
                                        return stars;
                                    })()}
                                    <span className="ms-3 text-muted">
                                        {adminRating > 0 && `(${getRatingLabel(adminRating)})`}
                                    </span>
                                </div>
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label className="fw-semibold">Comments (Optional)</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={4}
                                    value={adminComments}
                                    onChange={(e) => setAdminComments(e.target.value)}
                                    placeholder="Provide feedback or comments about the employee's performance..."
                                />
                                <Form.Text className="text-muted">
                                    These comments will be visible to the employee
                                </Form.Text>
                            </Form.Group>

                            <Alert variant="info" className="small">
                                <FaInfoCircle className="me-2" />
                                <strong>Note:</strong> As an admin, you can rate any employee. This rating will be shown separately from the manager's rating.
                            </Alert>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" size="sm" onClick={() => setShowAdminRatingModal(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={handleSubmitAdminRating}
                        disabled={submittingAdminRating || adminRating === 0}
                    >
                        {submittingAdminRating ? <Spinner size="sm" animation="border" className="me-2" /> : <FaSave className="me-2" />}
                        {selectedEmployeeForAdmin && hasAdminRatingForCurrentMonth(selectedEmployeeForAdmin.employee_id) ? 'Update Rating' : 'Submit Rating'}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Rating Details Modal */}
            <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)} centered size="lg">
                <Modal.Header closeButton className={`bg-${selectedRating ? getRatingColor(selectedRating.rating) : 'primary'} text-white`}>
                    <Modal.Title className="h6">
                        <FaStar className="me-2" />
                        Rating Details - {selectedRating?.employee_name}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-4">
                    {selectedRating && (
                        <>
                            <Row className="mb-3">
                                <Col xs={12} md={6}>
                                    <div className="small text-muted">Employee</div>
                                    <div className="fw-semibold">{selectedRating.employee_name}</div>
                                    <small className="text-muted">ID: {selectedRating.employee_id}</small>
                                </Col>
                                <Col xs={12} md={6}>
                                    <div className="small text-muted">Department</div>
                                    <div className="fw-semibold">{selectedRating.department || 'N/A'}</div>
                                </Col>
                            </Row>
                            <Row className="mb-3">
                                <Col xs={12} md={6}>
                                    <div className="small text-muted">Reporting Manager</div>
                                    <div className="fw-semibold">{selectedRating.reporting_manager || 'N/A'}</div>
                                </Col>
                                <Col xs={12} md={6}>
                                    <div className="small text-muted">Rating Period</div>
                                    <div className="fw-semibold">{selectedRating.month_name} {selectedRating.year}</div>
                                </Col>
                            </Row>
                            <Row className="mb-3">
                                <Col xs={12} md={6}>
                                    <div className="small text-muted">Rating</div>
                                    <div className="mb-2">{renderStars(selectedRating.rating)}</div>
                                    <Badge bg={getRatingColor(selectedRating.rating)} pill>
                                        {getRatingLabel(selectedRating.rating)} ({selectedRating.rating} Star)
                                    </Badge>
                                </Col>
                                <Col xs={12} md={6}>
                                    <div className="small text-muted">Rated By</div>
                                    <div className="fw-semibold">{selectedRating.rater_name}</div>
                                    <Badge bg={selectedRating.rater_role === 'Admin' ? 'success' : 'info'} pill className="mt-1">
                                        {selectedRating.rater_role}
                                    </Badge>
                                </Col>
                            </Row>
                            <Row className="mb-3">
                                <Col xs={12}>
                                    <div className="small text-muted">Comments</div>
                                    <div className="p-3 bg-light rounded">
                                        {selectedRating.comments || 'No comments provided'}
                                    </div>
                                </Col>
                            </Row>
                            <Row>
                                <Col xs={12} md={6}>
                                    <div className="small text-muted">Rating Date</div>
                                    <div className="fw-semibold">{new Date(selectedRating.created_at).toLocaleDateString()}</div>
                                </Col>
                            </Row>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" size="sm" onClick={() => setShowDetailsModal(false)}>Close</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default AdminRatings;