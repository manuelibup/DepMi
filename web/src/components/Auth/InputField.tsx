import React, { InputHTMLAttributes } from 'react';
import styles from './Auth.module.css';

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
}

export default function InputField({ label, error, className, ...props }: InputFieldProps) {
    return (
        <div className={`${styles.inputGroup} ${className || ''}`}>
            <label className={styles.label} htmlFor={props.id || props.name}>
                {label}
            </label>
            <input
                className={`${styles.input} ${error ? styles.inputError : ''}`}
                {...props}
            />
            {error && <span className={styles.errorText}>{error}</span>}
        </div>
    );
}
