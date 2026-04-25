// src/components/Employee/ManagerShiftUpdate.jsx
import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Alert, Spinner, Badge, Table } from 'react-bootstrap';
import { FaClock, FaUserTie, FaCheckCircle, FaExclamationTriangle, FaSyncAlt } from 'react-icons/fa';
import axios from '../../config/axios';
import API_ENDPOINTS from '../../config/api';
import { useAuth } from '../../context/AuthContext';

const SHIFT_OPTIONS = [
  '9:00 AM - 6:00 PM',
  '10:00 AM - 7:00 PM',
  '11:00 AM - 8:00 PM',
  '8:00 AM - 5:00 PM',
  '7:00 AM - 4:00 PM',
  '12:00 PM - 9:00 PM',
  '2:00 PM - 11:00 PM',
  '6:00 PM - 3:00 AM',
  '10:00 PM - 7:00 AM',
];

const ManagerShiftUpdate = () => {
  const { user } = useAuth();
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedShift, setSelectedShift] = useState('');
  const [customShift, setCustomShift] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => { fetchTeam(); }, []);

  const fetchTeam = async () => {
    try {
      setLoading(true);
      const res = await axios.get(API_ENDPOINTS.MANAGER_TEAM);
      setTeam(res.data.team || []);
    } catch (error) {
      setMessage({ type: 'danger', text: error.response?.data?.message || 'Failed to load team members' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    const shiftValue = useCustom ? customShift.trim() : selectedShift;
    if (!selectedEmployee) {
      setMessage({ type: 'warning', text: 'Please select an employee' });
      return;
    }
    if (!shiftValue) {
      setMessage({ type: 'warning', text: 'Please select or enter a shift timing' });
      return;
    }

    setUpdating(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await axios.put(API_ENDPOINTS.MANAGER_UPDATE_SHIFT(selectedEmployee), {
        shift_timing: shiftValue
      });
      setMessage({ type: 'success', text: res.data.message });
      // Update local team state
      setTeam(prev => prev.map(e =>
        e.employee_id === selectedEmployee ? { ...e, shift_timing: shiftValue } : e
      ));
      setSelectedEmployee('');
      setSelectedShift('');
      setCustomShift('');
      setUseCustom(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    } catch (error) {
      setMessage({ type: 'danger', text: error.response?.data?.message || 'Failed to update shift' });
    } finally {
      setUpdating(false);
    }
  };

  const selectedEmp = team.find(e => e.employee_id === selectedEmployee);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  return (
    <div className="p-2 p-md-3 p-lg-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h5 className="mb-0 d-flex align-items-center">
          <FaClock className="me-2 text-primary" />
          Update Team Shift Timing
        </h5>
        <Button variant="outline-primary" size="sm" onClick={fetchTeam}>
          <FaSyncAlt className="me-1" size={12} /> Refresh
        </Button>
      </div>

      {message.text && (
        <Alert variant={message.type} dismissible onClose={() => setMessage({ type: '', text: '' })} className="mb-3 py-2 small">
          {message.type === 'success' ? <FaCheckCircle className="me-2" /> : <FaExclamationTriangle className="me-2" />}
          {message.text}
        </Alert>
      )}

      {team.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <Card.Body className="text-center py-5">
            <FaUserTie size={40} className="text-muted mb-3 opacity-50" />
            <p className="text-muted mb-0">No team members found under your reporting.</p>
            <small className="text-muted">Employees whose reporting manager is set to your name will appear here.</small>
          </Card.Body>
        </Card>
      ) : (
        <>
          {/* Update Form */}
          <Card className="border-0 shadow-sm mb-4">
            <Card.Header className="bg-light py-2">
              <h6 className="mb-0 small fw-semibold">
                <FaClock className="me-2" size={14} />
                Update Shift
              </h6>
            </Card.Header>
            <Card.Body className="p-3">
              <Form>
                {/* Employee Dropdown */}
                <Form.Group className="mb-3">
                  <Form.Label className="small fw-semibold text-muted">
                    Select Employee <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Select
                    value={selectedEmployee}
                    onChange={e => setSelectedEmployee(e.target.value)}
                    size="sm"
                  >
                    <option value="">-- Select team member --</option>
                    {team.map(emp => (
                      <option key={emp.employee_id} value={emp.employee_id}>
                        {emp.first_name} {emp.last_name} ({emp.employee_id}) — Current: {emp.shift_timing || 'Not set'}
                      </option>
                    ))}
                  </Form.Select>
                  {selectedEmp && (
                    <div className="mt-1 small text-muted">
                      <strong>Department:</strong> {selectedEmp.department} &nbsp;|&nbsp;
                      <strong>Designation:</strong> {selectedEmp.designation} &nbsp;|&nbsp;
                      <strong>Current Shift:</strong> <Badge bg="info" className="px-2">{selectedEmp.shift_timing || 'Not set'}</Badge>
                    </div>
                  )}
                </Form.Group>

                {/* Shift Selection */}
                <Form.Group className="mb-3">
                  <Form.Label className="small fw-semibold text-muted">
                    New Shift Timing <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Check
                    type="checkbox"
                    label="Enter custom shift timing"
                    checked={useCustom}
                    onChange={e => { setUseCustom(e.target.checked); setSelectedShift(''); setCustomShift(''); }}
                    className="mb-2 small"
                  />
                  {useCustom ? (
                    <Form.Control
                      type="text"
                      size="sm"
                      placeholder="e.g. 9:00 AM - 6:00 PM"
                      value={customShift}
                      onChange={e => setCustomShift(e.target.value)}
                    />
                  ) : (
                    <Form.Select
                      value={selectedShift}
                      onChange={e => setSelectedShift(e.target.value)}
                      size="sm"
                    >
                      <option value="">-- Select shift --</option>
                      {SHIFT_OPTIONS.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </Form.Select>
                  )}
                  <Form.Text className="text-muted small">
                    Format: HH:MM AM/PM - HH:MM AM/PM (e.g. 9:00 AM - 6:00 PM)
                  </Form.Text>
                </Form.Group>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleUpdate}
                  disabled={updating || !selectedEmployee || (!selectedShift && !customShift.trim())}
                  className="px-4"
                >
                  {updating ? (
                    <><Spinner size="sm" animation="border" className="me-2" />Updating...</>
                  ) : (
                    <><FaClock className="me-2" size={12} />Update Shift</>
                  )}
                </Button>
              </Form>
            </Card.Body>
          </Card>

          {/* Team List */}
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-light py-2 d-flex justify-content-between align-items-center">
              <h6 className="mb-0 small fw-semibold">
                <FaUserTie className="me-2" size={14} />
                My Team ({team.length} members)
              </h6>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="table-responsive">
                <Table hover size="sm" className="mb-0">
                  <thead className="bg-light sticky-top" style={{ top: 0, zIndex: 10 }}>
                    <tr className="small">
                      <th className="fw-normal text-center">#</th>
                      <th className="fw-normal">Employee</th>
                      <th className="fw-normal d-none d-md-table-cell">Department</th>
                      <th className="fw-normal d-none d-sm-table-cell">Designation</th>
                      <th className="fw-normal">Current Shift</th>
                    </tr>
                  </thead>
                  <tbody>
                    {team.map((emp, idx) => (
                      <tr key={emp.employee_id}>
                        <td className="text-center small">{idx + 1}</td>
                        <td className="small">
                          <div className="fw-semibold">{emp.first_name} {emp.last_name}</div>
                          <small className="text-muted">{emp.employee_id}</small>
                        </td>
                        <td className="small d-none d-md-table-cell">{emp.department}</td>
                        <td className="small d-none d-sm-table-cell">{emp.designation}</td>
                        <td className="small">
                          <Badge bg="info" className="px-2 py-1">
                            <FaClock className="me-1" size={10} />
                            {emp.shift_timing || 'Not set'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </>
      )}
    </div>
  );
};

export default ManagerShiftUpdate;
