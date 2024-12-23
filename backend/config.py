import os

class Config:
    MYSQL_HOST = os.getenv('MYSQL_HOST', 'localhost')
    MYSQL_PORT = int(os.getenv('MYSQL_PORT', 3306))
    MYSQL_USER = os.getenv('MYSQL_USER', 'root')
    MYSQL_PASSWORD = os.getenv('MYSQL_PASSWORD', '7q6K!LkLB!cGJqU#')
    MYSQL_DB = os.getenv('MYSQL_DB', 'kube_bench') 

# kube-bench job templates
KUBE_BENCH_MASTER_JOB = """
apiVersion: batch/v1
kind: Job
metadata:
  name: kube-bench-master
spec:
  ttlSecondsAfterFinished: 100
  template:
    spec:
      hostPID: true
      tolerations:
      - key: ""
        operator: "Exists"
      containers:
        - name: kube-bench
          image: docker.io/aquasec/kube-bench:latest
          command: ["kube-bench-zh-amd", "run", "--json", "--targets", "master,node,controlplane,etcd,policies"]
          volumeMounts:
            - name: var-lib-cni
              mountPath: /var/lib/cni
              readOnly: true
            - name: var-lib-etcd
              mountPath: /var/lib/etcd
              readOnly: true
            - name: var-lib-kubelet
              mountPath: /var/lib/kubelet
              readOnly: true
            - name: var-lib-kube-scheduler
              mountPath: /var/lib/kube-scheduler
              readOnly: true
            - name: var-lib-kube-controller-manager
              mountPath: /var/lib/kube-controller-manager
              readOnly: true
            - name: etc-systemd
              mountPath: /etc/systemd
              readOnly: true
            - name: lib-systemd
              mountPath: /lib/systemd/
              readOnly: true
            - name: srv-kubernetes
              mountPath: /srv/kubernetes/
              readOnly: true
            - name: etc-kubernetes
              mountPath: /etc/kubernetes
              readOnly: true
            - name: usr-bin
              mountPath: /usr/local/mount-from-host/bin
              readOnly: true
            - name: etc-cni-netd
              mountPath: /etc/cni/net.d/
              readOnly: true
            - name: opt-cni-bin
              mountPath: /opt/cni/bin/
              readOnly: true
            - name: etc-passwd
              mountPath: /etc/passwd
              readOnly: true
            - name: etc-group
              mountPath: /etc/group
              readOnly: true
      restartPolicy: Never
      terminationGracePeriodSeconds: 30
      volumes:
        - name: var-lib-cni
          hostPath:
            path: "/var/lib/cni"
        - name: var-lib-etcd
          hostPath:
            path: "/var/lib/etcd"
        - name: var-lib-kubelet
          hostPath:
            path: "/var/lib/kubelet"
        - name: var-lib-kube-scheduler
          hostPath:
            path: "/var/lib/kube-scheduler"
        - name: var-lib-kube-controller-manager
          hostPath:
            path: "/var/lib/kube-controller-manager"
        - name: etc-systemd
          hostPath:
            path: "/etc/systemd"
        - name: lib-systemd
          hostPath:
            path: "/lib/systemd"
        - name: srv-kubernetes
          hostPath:
            path: "/srv/kubernetes"
        - name: etc-kubernetes
          hostPath:
            path: "/etc/kubernetes"
        - name: usr-bin
          hostPath:
            path: "/usr/bin"
        - name: etc-cni-netd
          hostPath:
            path: "/etc/cni/net.d/"
        - name: opt-cni-bin
          hostPath:
            path: "/opt/cni/bin/"
        - name: etc-passwd
          hostPath:
            path: "/etc/passwd"
        - name: etc-group
          hostPath:
            path: "/etc/group"
"""

KUBE_BENCH_WORKER_JOB = """
apiVersion: batch/v1
kind: Job
metadata:
  name: kube-bench-node
spec:
  ttlSecondsAfterFinished: 100
  template:
    spec:
      hostPID: true
      tolerations:
      - key: ""
        operator: "Exists"     
      containers:
        - name: kube-bench
          image: docker.io/aquasec/kube-bench:latest
          command: ["kube-bench-zh-amd", "run", "--json", "--targets", "node,policies"]
          volumeMounts:
            - name: var-lib-cni
              mountPath: /var/lib/cni
              readOnly: true
            - name: var-lib-etcd
              mountPath: /var/lib/etcd
              readOnly: true
            - name: var-lib-kubelet
              mountPath: /var/lib/kubelet
              readOnly: true
            - name: var-lib-kube-scheduler
              mountPath: /var/lib/kube-scheduler
              readOnly: true
            - name: var-lib-kube-controller-manager
              mountPath: /var/lib/kube-controller-manager
              readOnly: true
            - name: etc-systemd
              mountPath: /etc/systemd
              readOnly: true
            - name: lib-systemd
              mountPath: /lib/systemd/
              readOnly: true
            - name: srv-kubernetes
              mountPath: /srv/kubernetes/
              readOnly: true
            - name: etc-kubernetes
              mountPath: /etc/kubernetes
              readOnly: true
            - name: usr-bin
              mountPath: /usr/local/mount-from-host/bin
              readOnly: true
            - name: etc-cni-netd
              mountPath: /etc/cni/net.d/
              readOnly: true
            - name: opt-cni-bin
              mountPath: /opt/cni/bin/
              readOnly: true
      restartPolicy: Never
      terminationGracePeriodSeconds: 30
      volumes:
        - name: var-lib-cni
          hostPath:
            path: "/var/lib/cni"
        - name: var-lib-etcd
          hostPath:
            path: "/var/lib/etcd"
        - name: var-lib-kubelet
          hostPath:
            path: "/var/lib/kubelet"
        - name: var-lib-kube-scheduler
          hostPath:
            path: "/var/lib/kube-scheduler"
        - name: var-lib-kube-controller-manager
          hostPath:
            path: "/var/lib/kube-controller-manager"
        - name: etc-systemd
          hostPath:
            path: "/etc/systemd"
        - name: lib-systemd
          hostPath:
            path: "/lib/systemd"
        - name: srv-kubernetes
          hostPath:
            path: "/srv/kubernetes"
        - name: etc-kubernetes
          hostPath:
            path: "/etc/kubernetes"
        - name: usr-bin
          hostPath:
            path: "/usr/bin"
        - name: etc-cni-netd
          hostPath:
            path: "/etc/cni/net.d/"
        - name: opt-cni-bin
          hostPath:
            path: "/opt/cni/bin/"
"""